import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { TaskType } from "@google/generative-ai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import { sources, projects } from "@/server/db/schema";
import { s3Client } from "@/lib/s3";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { env } from "@/env";
import type { ProjectSource } from "@/lib/types";
import {
  PGVectorStore,
  type DistanceStrategy,
} from "@langchain/community/vectorstores/pgvector";

const embeddings = new GoogleGenerativeAIEmbeddings({
  model: "text-embedding-004",
  apiKey: env.GOOGLE_GENAI_API_KEY,
  taskType: TaskType.RETRIEVAL_DOCUMENT,
  title: "Document title",
});

const config = {
  postgresConnectionOptions: {
    connectionString: env.DATABASE_URL,
  },
  tableName: "vector_store",
  columns: {
    idColumnName: "id",
    vectorColumnName: "vector",
    contentColumnName: "content",
    metadataColumnName: "metadata",
  },
  distanceStrategy: "cosine" as DistanceStrategy,
  dimensions: 768,
};

export const vectorStore = await PGVectorStore.initialize(embeddings, config);

export const sourcesRouter = createTRPCRouter({
  getSources: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      const project = await db.query.projects.findFirst({
        where: and(
          eq(projects.id, input.projectId),
          eq(projects.createdById, ctx.userId),
        ),
      });

      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      const projectSources = await db.query.sources.findMany({
        where: eq(sources.projectId, input.projectId),
      });

      return projectSources;
    }),

  getSource: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const source = await db.query.sources.findFirst({
        where: and(
          eq(sources.id, input.id),
          eq(sources.createdById, ctx.userId),
        ),
        with: {
          project: true,
        },
      });

      if (!source) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Source not found",
        });
      }

      return source;
    }),

  createSource: protectedProcedure
    .input(z.custom<ProjectSource>())
    .mutation(async ({ ctx, input }) => {
      // Verify project ownership
      const project = await db.query.projects.findFirst({
        where: and(
          eq(projects.id, input.metadata.projectId!),
          eq(projects.createdById, ctx.userId),
        ),
      });

      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      // Add the source to the vector store first
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });

      const docs = await textSplitter.createDocuments(
        [input.pageContent],
        [input.metadata],
      );

      try {
        await vectorStore.addDocuments(docs);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to add source to vector store",
          cause: error,
        });
      }

      // If successful, then insert into the database
      const [source] = await ctx.db
        .insert(sources)
        .values({
          ...(input.metadata as typeof sources.$inferInsert),
          createdById: ctx.userId,
        })
        .returning();

      if (!source) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create source",
        });
      }

      return source;
    }),

  deleteSource: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Verify source ownership
      const [source] = await ctx.db
        .delete(sources)
        .where(
          and(eq(sources.id, input.id), eq(sources.createdById, ctx.userId)),
        )
        .returning();

      if (!source) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Source not found",
        });
      }

      // Delete from vector store
      try {
        await vectorStore.delete({
          filter: { id: source.id },
        });
      } catch (error) {
        console.error("Failed to delete from vector store:", error);
        // We don't throw here since we want to continue with R2 deletion
      }

      // Delete the file from R2
      try {
        await s3Client.send(
          new DeleteObjectCommand({
            Bucket: env.R2_BUCKET_NAME,
            Key: source.key,
          }),
        );
      } catch (error) {
        console.error("Failed to delete file from R2:", error);
        // We don't throw here since the database record is already deleted
      }

      return source;
    }),
});
