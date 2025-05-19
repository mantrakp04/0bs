import type { Id, Doc } from "../_generated/dataModel";
import { action, mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { api } from "convex/_generated/api";
import { requireAuth } from "../utils/helpers";
import { paginationOptsValidator } from "convex/server";

export const get = query({
  args: {
    projectDocumentVectorId: v.id("projectDocumentVectors"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const projectDocumentVector = await ctx.db.get(
      args.projectDocumentVectorId,
    );
    if (!projectDocumentVector) {
      throw new Error("Project document vector not found");
    }

    const projectDocument = await ctx.runQuery(
      api.routes.projectDocuments.get,
      {
        projectDocumentId: projectDocumentVector.projectDocumentId,
      },
    );
    if (!projectDocument) {
      throw new Error("Project document not found");
    }

    return projectDocumentVector;
  },
});

export const getAll = query({
  args: {
    projectDocumentId: v.id("projectDocuments"),
    paginationOpts: paginationOptsValidator,
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

    const projectDocumentVectors = await ctx.db
      .query("projectDocumentVectors")
      .withIndex("by_project_document", (q) =>
        q.eq("projectDocumentId", args.projectDocumentId),
      )
      .paginate(args.paginationOpts);

    return projectDocumentVectors;
  },
});

export const getMultiple = query({
  args: {
    projectDocumentVectorIds: v.array(v.id("projectDocumentVectors")),
  },
  handler: async (ctx, args): Promise<Doc<"projectDocumentVectors">[]> => {
    await requireAuth(ctx);

    return await Promise.all(
      args.projectDocumentVectorIds.map(async (projectDocumentVectorId) => {
        const projectDocumentVector = await ctx.runQuery(
          api.routes.projectDocumentVectors.get,
          {
            projectDocumentVectorId,
          },
        );
        if (!projectDocumentVector) {
          throw new Error("Project document vector not found");
        }

        return projectDocumentVector;
      }),
    );
  },
});

export const create = mutation({
  args: {
    embedding: v.array(v.number()),
    text: v.string(),
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

    return await ctx.db.insert("projectDocumentVectors", {
      embedding: args.embedding,
      text: args.text,
      projectDocumentId: args.projectDocumentId,
    });
  },
});

export const search = action({
  args: {
    vector: v.array(v.number()),
    filter: v.object({
      projectId: v.id("projects"),
      excludeProjectDocumentIds: v.optional(v.array(v.id("projectDocuments"))),
    }),
  },
  handler: async (
    ctx,
    args,
  ): Promise<
    Array<{
      document: Doc<"documents">;
      projectDocumentVector: Doc<"projectDocumentVectors">;
      score: number;
      url: string | null;
    }>
  > => {
    await requireAuth(ctx);

    // Get all project documents for the given project
    const projectDocuments = await ctx.runQuery(
      api.routes.projectDocuments.getAll,
      {
        projectId: args.filter.projectId,
        paginationOpts: {
          numItems: 1000,
          cursor: null,
        },
      },
    );

    // Filter out excluded documents
    const includedProjectDocuments: Doc<"projectDocuments">[] =
      projectDocuments.projectDocuments.filter(
        (projectDocument: Doc<"projectDocuments">) =>
          !args.filter.excludeProjectDocumentIds?.includes(projectDocument._id),
      );
    const projectDocumentIds: Id<"projectDocuments">[] =
      includedProjectDocuments.map((projectDocument) => projectDocument._id);

    // Perform vector search
    const vectorSearchResults = await ctx.vectorSearch(
      "projectDocumentVectors",
      "embedding",
      {
        vector: args.vector,
        limit: 3,
        filter: (q) =>
          q.or(
            ...projectDocumentIds.map((projectDocumentId) =>
              q.eq("projectDocumentId", projectDocumentId),
            ),
          ),
      },
    );

    // Early return if no results
    if (vectorSearchResults.length === 0) {
      return [];
    }

    // Get project document vectors
    const projectDocumentVectors = await ctx.runQuery(
      api.routes.projectDocumentVectors.getMultiple,
      {
        projectDocumentVectorIds: vectorSearchResults.map(({ _id }) => _id),
      },
    );

    // Create a map of scores from vector search results
    const scores = new Map(
      vectorSearchResults.map((result) => [
        result._id.toString(),
        result._score,
      ]),
    );

    // Get associated documents
    const projectDocumentsFromVectors = await ctx.runQuery(
      api.routes.projectDocuments.getMultiple,
      {
        projectDocumentIds: projectDocumentVectors.map(
          (vector) => vector.projectDocumentId,
        ),
      },
    );

    // Create a map for faster document lookups
    const documentMap = new Map(
      projectDocumentsFromVectors.map((doc) => [doc._id.toString(), doc]),
    );

    // Get URLs for all documents in a single batch
    const urls = await Promise.all(
      projectDocumentsFromVectors.map((doc) =>
        ctx.storage.getUrl(doc.document.key),
      ),
    );

    // Create a map for faster URL lookups
    const urlMap = new Map(
      projectDocumentsFromVectors.map((doc, index) => [
        doc._id.toString(),
        urls[index],
      ]),
    );

    // Build final response
    return projectDocumentVectors
      .map((vector) => {
        const projectDocument = documentMap.get(
          vector.projectDocumentId.toString(),
        );
        if (!projectDocument) return null;

        return {
          document: projectDocument.document,
          projectDocumentVector: vector,
          score: scores.get(vector._id.toString()) ?? 0,
          url: urlMap.get(projectDocument._id.toString()) ?? null,
        };
      })
      .filter((result): result is NonNullable<typeof result> => result !== null)
      .sort((a, b) => b.score - a.score); // Sort by score in descending order
  },
});

export const removeByProject = mutation({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const projectDocuments = await ctx.runQuery(
      api.routes.projectDocuments.getAll,
      {
        projectId: args.projectId,
        paginationOpts: {
          numItems: 1000,
          cursor: null,
        },
      },
    );
    const projectDocumentIds = projectDocuments.projectDocuments.map(
      (projectDocument) => projectDocument._id,
    );

    await Promise.all(
      projectDocumentIds.map((projectDocumentId) =>
        ctx.db.delete(projectDocumentId),
      ),
    );
  },
});

export const remove = mutation({
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

    const projectDocumentVectorsToDelete = await ctx.db
      .query("projectDocumentVectors")
      .withIndex("by_project_document", (q) =>
        q.eq("projectDocumentId", args.projectDocumentId),
      )
      .collect();

    await Promise.all(
      projectDocumentVectorsToDelete.map((projectDocumentVector) =>
        ctx.db.delete(projectDocumentVector._id),
      ),
    );
  },
});
