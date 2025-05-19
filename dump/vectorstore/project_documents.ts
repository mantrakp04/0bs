"use node";

import { api, internal } from "../_generated/api";
import { action } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../utils/helpers";
import {
  RecursiveCharacterTextSplitter,
  type SupportedTextSplitterLanguage,
} from "@langchain/textsplitters";
import mime from "mime";
import { YoutubeLoader } from "@langchain/community/document_loaders/web/youtube";
import type { Id, Doc } from "../_generated/dataModel";
import { embeddings } from "convex/langchain/models";
import { Document } from "langchain/document";

export const add = action({
  args: {
    projectDocumentId: v.id("projectDocuments"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    const projectDocument = await ctx.runQuery(
      api.routes.projectDocuments.get,
      {
        projectDocumentId: args.projectDocumentId,
      },
    );
    if (!projectDocument) {
      throw new Error("Project document not found");
    }

    // Verify user has access to the project
    const project = await ctx.runQuery(api.routes.projects.get, {
      projectId: projectDocument.project._id,
    });
    if (!project) {
      throw new Error("Project not found");
    }

    const document = projectDocument.document;

    let splitDocuments: Document[] = [];
    if (typeof document.type === typeof v.literal("file")) {
      try {
        const { langchainDocument } = await ctx.runAction(
          internal.actions.docling_loader.loadDocling,
          {
            documentId: document._id,
          },
        );
        if (langchainDocument) {
          const splitter = RecursiveCharacterTextSplitter.fromLanguage(
            "markdown",
            {
              chunkSize: 1000,
              chunkOverlap: 200,
            },
          );
          splitDocuments = await splitter.splitDocuments([langchainDocument]);
        } else {
          // If docling processing fails or returns no document, try to read the file directly
          const blob = await ctx.storage.get(document.key);
          if (!blob) {
            throw new Error("Document not found");
          }

          const text = await blob.text();
          const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
          });
          const sourceDocument = new Document({
            pageContent: text,
            metadata: {
              projectId: projectDocument.project._id,
              documentId: projectDocument.document._id,
            },
          });
          splitDocuments = await splitter.splitDocuments([sourceDocument]);
        }
      } catch (error) {
        // If docling processing fails, try to read the file directly
        const blob = await ctx.storage.get(document.key);
        if (!blob) {
          throw new Error("Document not found");
        }

        const text = await blob.text();
        const splitter = new RecursiveCharacterTextSplitter({
          chunkSize: 1000,
          chunkOverlap: 200,
        });
        const sourceDocument = new Document({
          pageContent: text,
          metadata: {
            projectId: projectDocument.project._id,
            documentId: projectDocument.document._id,
          },
        });
        splitDocuments = await splitter.splitDocuments([sourceDocument]);
      }
    } else if (typeof document.type === typeof v.literal("youtube")) {
      const loader = YoutubeLoader.createFromUrl(document.key, {
        language: "en",
        addVideoInfo: false,
      });
      const documents = await loader.load();
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });
      splitDocuments = await splitter.splitDocuments(documents);
    } else if (typeof document.type === typeof v.literal("url")) {
      const response = await fetch(
        `http://localhost:5002/crawl/?url=${document.key}&max_depth=0`,
      );
      const data = await response.json();
      const documents = [
        new Document({
          pageContent: data.markdown,
          metadata: {
            projectId: projectDocument.project._id,
            documentId: projectDocument.document._id,
          },
        }),
      ];
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });
      splitDocuments = await splitter.splitDocuments(documents);
    } else if (typeof document.type === typeof v.literal("site")) {
      const response = await fetch(
        `http://localhost:5002/crawl/?url=${document.key}&max_depth=3`,
      );
      const data = await response.json();
      const documents = data.map(
        ({ url, markdown }: { url: string; markdown: string }) =>
          new Document({
            pageContent: markdown,
            metadata: {
              projectId: projectDocument.project._id,
              documentId: projectDocument.document._id,
              source: url,
            },
          }),
      );
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });
      splitDocuments = await splitter.splitDocuments(documents);

      const sourceUrls = documents.map(
        ({ metadata }: { metadata: { source: string } }) => metadata.source,
      );
      // Create these sources with the key as the url and type as the parent document ID
      const sourceDocumentIds = await Promise.all(
        sourceUrls.map(async (url: string, index: number) => {
          const sourceDocumentId = await ctx.runMutation(
            api.routes.documents.create,
            {
              name: splitDocuments[index].metadata.title || url,
              type: document._id, // Using the parent document's ID as the type
              key: url,
              size: 0,
            },
          );
          await ctx.runMutation(api.routes.projectDocuments.create, {
            projectId: projectDocument.project._id,
            documentId: sourceDocumentId,
          });
          return sourceDocumentId;
        }),
      );

      splitDocuments = splitDocuments.map((document, index) => ({
        ...document,
        metadata: {
          ...document.metadata,
          documentId: sourceDocumentIds[index],
        },
      }));
    } else {
      let splitter: RecursiveCharacterTextSplitter;
      try {
        splitter = RecursiveCharacterTextSplitter.fromLanguage(
          mime.getExtension(document.type) as SupportedTextSplitterLanguage,
          {
            chunkSize: 1000,
            chunkOverlap: 200,
          },
        );
      } catch (error) {
        splitter = new RecursiveCharacterTextSplitter({
          chunkSize: 1000,
          chunkOverlap: 200,
        });
      }

      const blob = await ctx.storage.get(document.key);
      if (!blob) {
        throw new Error("Document not found");
      }

      const text = await blob.text();
      const sourceDocument = new Document({
        pageContent: text,
        metadata: {
          projectId: projectDocument.project._id,
          documentId: projectDocument.document._id,
        },
      });

      splitDocuments = await splitter.splitDocuments([sourceDocument]);
    }

    const vectors = await embeddings.embedDocuments(
      splitDocuments.map(({ pageContent }) => pageContent),
    );
    const ids: Id<"projectDocumentVectors">[] = await Promise.all(
      splitDocuments.map(async (document, index) => {
        const projectDocumentVectorId = await ctx.runMutation(
          api.routes.projectDocumentVectors.create,
          {
            embedding: vectors[index],
            text: document.pageContent,
            projectDocumentId: projectDocument._id,
          },
        );
        return projectDocumentVectorId;
      }),
    );

    return ids;
  },
});

export const search = action({
  args: {
    query: v.string(),
    filter: v.object({
      projectId: v.id("projects"),
      excludeDocumentIds: v.optional(v.array(v.id("documents"))),
    }),
  },
  handler: async (ctx, args): Promise<Document[]> => {
    await requireAuth(ctx);

    const vectors = await embeddings.embedQuery(args.query);

    // Get project document IDs to exclude
    const excludeProjectDocumentIds = await Promise.all(
      (args.filter.excludeDocumentIds || []).map(
        async (docId: Id<"documents">) => {
          const projectDoc = await ctx.runQuery(
            api.routes.projectDocuments.getAll,
            {
              projectId: args.filter.projectId,
              paginationOpts: { numItems: 1, cursor: null },
            },
          );
          return projectDoc.projectDocuments.find(
            (pd: Doc<"projectDocuments">) => pd.documentId === docId,
          )?._id;
        },
      ),
    );
    const filteredExcludeIds = excludeProjectDocumentIds.filter(
      (id): id is Id<"projectDocuments"> => id !== undefined,
    );

    const searchResults = await ctx.runAction(
      api.routes.projectDocumentVectors.search,
      {
        vector: vectors,
        filter: {
          projectId: args.filter.projectId,
          excludeProjectDocumentIds: filteredExcludeIds,
        },
      },
    );

    // Transform search results into Documents
    const projectDocuments: Document[] = searchResults.map(
      (result: {
        document: Doc<"documents">;
        projectDocumentVector: Doc<"projectDocumentVectors">;
        url: string | null;
      }) => ({
        pageContent: `[${result.document.name}](${result.url}):\n${result.projectDocumentVector.text}`,
        metadata: {
          projectId: args.filter.projectId,
          documentId: result.document._id,
        },
      }),
    );

    return projectDocuments;
  },
});

export const remove = action({
  args: {
    projectDocumentId: v.id("projectDocuments"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const projectDocument = await ctx.runQuery(
      api.routes.projectDocuments.get,
      {
        projectDocumentId: args.projectDocumentId,
      },
    );
    if (!projectDocument) {
      throw new Error("Project document not found");
    }

    // First remove the project document
    await ctx.runMutation(api.routes.projectDocuments.remove, {
      projectDocumentId: args.projectDocumentId,
    });

    // Then remove all associated vectors
    await ctx.runMutation(api.routes.projectDocumentVectors.remove, {
      projectDocumentId: args.projectDocumentId,
    });
  },
});

export const addFromStorage = action({
  args: {
    projectId: v.id("projects"),
    storageId: v.id("_storage"),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    documentId: Id<"documents">;
    projectDocumentId: Id<"projectDocuments">;
    vectorIds: Id<"projectDocumentVectors">[];
  }> => {
    const { userId } = await requireAuth(ctx);

    // Get the project to verify it exists and user has access
    const project = await ctx.runQuery(api.routes.projects.get, {
      projectId: args.projectId,
    });
    if (!project) {
      throw new Error("Project not found");
    }

    // Get the file info from storage
    const blob = await ctx.storage.get(args.storageId);
    if (!blob) {
      throw new Error("File not found in storage");
    }

    // Create a document record
    const documentId = await ctx.runMutation(api.routes.documents.create, {
      name: args.storageId,
      type: "file",
      size: blob.size,
      key: args.storageId,
    });

    // Create project document association
    const projectDocumentId = await ctx.runMutation(
      api.routes.projectDocuments.create,
      {
        projectId: args.projectId,
        documentId: documentId,
      },
    );

    // Process the document and create vectors
    const vectorIds = await ctx.runAction(api.actions.project_documents.add, {
      projectDocumentId: projectDocumentId,
    });

    return {
      documentId,
      projectDocumentId,
      vectorIds,
    };
  },
});
