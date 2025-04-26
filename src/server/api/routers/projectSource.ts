import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { projectSourceIds, projectSources, sources } from "@/server/db/schema";
import { eq, inArray } from "drizzle-orm";
import type { LangchainDocument } from "@/lib/types";
import {
  CloudflareVectorizeStore
} from "@langchain/cloudflare";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { env } from "@/env";
import { s3Client } from "@/app/api/upload/route";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { type db } from "@/server/db";
import { TRPCError } from "@trpc/server";
import mime from 'mime';
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

export const embeddings = new GoogleGenerativeAIEmbeddings({
  model: "models/text-embedding-004",
  apiKey: env.GOOGLE_GENAI_API_KEY,
});

export const vectorstore = new CloudflareVectorizeStore(embeddings, {
  index: env.NODE_ENV,
});

export const projectSourceRouter = createTRPCRouter({
  // Create new sources from Langchain documents
  create: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      keys: z.array(z.string()), // from sources table
      skipTypes: z.array(z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      // Convert S3 keys to documents
      const documents = await convertS3KeysToDocuments(input.keys, input.skipTypes, ctx);

      // Verify project ownership
      const project = await ctx.db.query.projects.findFirst({
        where: (projects, { eq }) => eq(projects.id, input.projectId),
      });
      
      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Project with id ${input.projectId} not found`
        });
      }
      
      if (project.createdById !== ctx.userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to add sources to this project'
        });
      }

      // Add to projectSources
      const projectSource = await ctx.db.insert(projectSources).values(documents.map((document) => ({
        projectId: input.projectId,
        sourceId: document.metadata.id
      }))).returning();

      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200, // total 1200
        separators: ["\n## ", "\n### ", "\n#### ", "\n##### ", "\n###### ", "\n", " ", ""],
      });

      // Track all split documents for the final count
      let totalDocsCount = 0;
      
      await Promise.all(documents.map(async (document, index) => {
        const projectSourceRecord = projectSource[index];
        
        if (!document || !projectSourceRecord || !projectSourceRecord.id) {
          return; // Skip if we don't have valid records
        }
        
        // Split documents and preserve metadata
        const splitDocs = await textSplitter.splitDocuments([document]);
        
        if (splitDocs.length === 0) return; // Skip empty documents
        
        // Add documents to vectorstore
        const ids = await vectorstore.addDocuments(splitDocs);
        
        // Update count
        totalDocsCount += splitDocs.length;
        
        // Prepare all IDs for batch insertion
        return ids.map(id => ({
          vectorId: id,
          projectSourceId: projectSourceRecord.id
        }));
      })).then(async (idArrays) => {
        // Flatten and filter out undefined values
        const allIds = idArrays.filter(Boolean).flat();
        
        // Batch insert all vector IDs
        if (allIds.length > 0) {
          await ctx.db.insert(projectSourceIds).values(allIds as { vectorId: string; projectSourceId: string }[]);
        }
      });

      // Return success
      return { success: true, documentCount: totalDocsCount };
    }),

  // Get all sources
  getAll: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      limit: z.number().min(1).max(100).nullish(),
      cursor: z.number().nullish(),
    }))
    .query(async ({ ctx, input }) => {
      // Verify project ownership
      const project = await ctx.db.query.projects.findFirst({
        where: (projects, { eq }) => eq(projects.id, input.projectId),
      });

      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Project with id ${input.projectId} not found`
        });
      }

      if (project.createdById !== ctx.userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to view sources for this project'
        });
      }

      const limit = input.limit ?? 10;
      const cursor = input.cursor;

      const items = await ctx.db.query.projectSources.findMany({
        where: (projectSources, { eq }) => eq(projectSources.projectId, input.projectId),
        orderBy: (projectSources, { desc }) => [desc(projectSources.id)],
        with: {
          source: true
        },
        limit: limit + 1,
        ...(cursor ? { offset: cursor } : {}),
      });

      let nextCursor: typeof cursor | undefined = undefined;
      if (items.length > limit) {
        const nextItem = items.pop();
        nextCursor = cursor ? cursor + limit : limit;
      }

      return {
        items,
        nextCursor,
      };
    }),

  // Get a single source by ID
  getById: protectedProcedure
    .input(z.object({ 
      id: z.string(), // id from sources table
      projectId: z.string() // project ID for ownership verification
    }))
    .query(async ({ ctx, input }) => {
      // Verify project ownership
      const project = await ctx.db.query.projects.findFirst({
        where: (projects, { eq }) => eq(projects.id, input.projectId),
      });

      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Project with id ${input.projectId} not found`
        });
      }

      if (project.createdById !== ctx.userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to access this project'
        });
      }

      // Verify that the source is associated with the project
      const projectSource = await ctx.db.query.projectSources.findFirst({
        where: (projectSources, { and, eq }) => and(
          eq(projectSources.projectId, input.projectId),
          eq(projectSources.sourceId, input.id)
        ),
      });

      if (!projectSource) {
        throw new TRPCError({
          code: 'NOT_FOUND', 
          message: 'Source not found in this project'
        });
      }

      // Get the source with complete data
      const source = await ctx.db.query.sources.findFirst({
        where: (sources, { eq }) => eq(sources.id, input.id),
      });

      return source;
    }),

  // Delete a source
  delete: protectedProcedure
    .input(z.object({ id: z.string() })) // from projectSources table
    .mutation(async ({ ctx, input }) => {
      const source = await ctx.db.query.projectSourceIds.findMany({
        where: (projectSourceIds, { eq }) => eq(projectSourceIds.projectSourceId, input.id),
      });
      if (!source) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Source with id ${input.id} not found`
        });
      }

      // Delete from vectorstore
      await vectorstore.delete({
        ids: source.map((s) => s.vectorId)
      });

      // Verify ownership
      const projectSource = await ctx.db.query.projectSources.findFirst({
        where: (projectSources, { eq }) => eq(projectSources.id, input.id),
        with: {
          project: true
        }
      });

      if (!projectSource) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Project source with id ${input.id} not found`
        });
      }

      if (projectSource.project.createdById !== ctx.userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to delete this source'
        });
      }

      // Delete from projectSourceIds
      await ctx.db.delete(projectSourceIds).where(eq(projectSourceIds.projectSourceId, input.id));

      // Delete from projectSources
      await ctx.db.delete(projectSources).where(eq(projectSources.id, input.id));

      return { success: true };
    }),
});

export async function convertS3KeysToDocuments(keys: string[], skipTypes: string[], ctx: { db: typeof db }): Promise<LangchainDocument[]> {
  try {
    type PresignedUrlInfo = {
      url: string;
      key: string;
      mimeType: string | null;
    };

    // Generate presigned URLs in parallel
    const presignedUrls = await Promise.all(keys.map(async (key): Promise<PresignedUrlInfo> => {
      const command = new GetObjectCommand({
        Bucket: env.S3_BUCKET_NAME,
        Key: key,
      });
      return {
        url: await getSignedUrl(s3Client, command, {
          expiresIn: 60 * 60 * 24 * 30, // 30 days
        }),
        key,
        mimeType: mime.getType(key)
      };
    }));

    // Fetch all sources in a single query
    const sourceInfos = await ctx.db.query.sources.findMany({
      // No need to verify if the source belongs to the user because the keys are uuids
      where: (sources, { inArray }) => inArray(sources.key, keys),
    });

    // Create a map for efficient lookup
    const sourceMap = new Map(
      sourceInfos.map(source => [source.key, source])
    );

    // Process documents in parallel to improve performance
    const documentPromises = presignedUrls.map(async (presignedUrlInfo) => {
      if (!presignedUrlInfo) return null;

      const { url, key, mimeType } = presignedUrlInfo;
      const sourceInfo = sourceMap.get(key);
      
      if (!sourceInfo) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Source info not found for key: ${key}`
        });
      }

      // If mime type is in skipTypes, return document with empty content
      if (mimeType && skipTypes.includes(mimeType)) {
        return {
          pageContent: "",
          metadata: {
            ...sourceInfo,
            source: sourceInfo.name ?? "",
            json_content: null,
            presignedUrl: url
          }
        };
      }

      // Process non-skipped types
      const body = {
        "options": {
          "from_formats": [
            "docx", "pptx", "html", "image", "pdf", "asciidoc", 
            "md", "csv", "xlsx", "xml_uspto", "xml_jats", "json_docling"
          ],
          "to_formats": ["md"],
          "image_export_mode": "referenced",
          "do_ocr": true,
          "force_ocr": false,
          "ocr_engine": "easyocr",
          "pdf_backend": "dlparse_v4",
          "table_mode": "fast",
          "abort_on_error": false,
          "return_as_file": false,
          "do_table_structure": true,
          "include_images": true,
          "images_scale": 2,
          "do_code_enrichment": false,
          "do_formula_enrichment": false,
          "do_picture_classification": false,
          "do_picture_description": false
        },
        "file_sources": {
          "base64_string": url,
          "filename": sourceInfo.name
        }
      };

      const response = await fetch(env.DOCLING_URL, {
        method: "POST",
        body: JSON.stringify(body),
      });
      const data = await response.json();

      return {
        pageContent: data.md_content,
        metadata: {
          ...sourceInfo,
          source: sourceInfo.name ?? "",
          json_content: data.json_content,
          presignedUrl: url
        }
      };
    });

    // Wait for all document processing to complete
    const documents = (await Promise.all(documentPromises)).filter(Boolean) as LangchainDocument[];

    return documents;
  } catch (error) {
    console.error('Error converting S3 keys to documents:', error);
    throw error;
  }
}
