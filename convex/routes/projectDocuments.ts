import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../utils/helpers";
import { paginationOptsValidator } from "convex/server";
import { api } from "convex/_generated/api";
import type { Id, Doc } from "convex/_generated/dataModel";

export const get = query({
  args: {
    projectDocumentId: v.id("projectDocuments"),
  },
  handler: async (
    ctx,
    args,
  ): Promise<
    Doc<"projectDocuments"> & {
      project: Doc<"projects">;
      document: Doc<"documents">;
    }
  > => {
    await requireAuth(ctx);

    const projectDocument = await ctx.db.get(args.projectDocumentId);
    if (!projectDocument) {
      throw new Error("Project document not found");
    }

    const project = await ctx.runQuery(api.routes.projects.get, {
      projectId: projectDocument.projectId as Id<"projects">,
    });
    if (!project) {
      throw new Error("Project not found");
    }

    const document = await ctx.runQuery(api.routes.documents.get, {
      documentId: projectDocument.documentId as Id<"documents">,
    });
    if (!document) {
      throw new Error("Document not found");
    }

    return {
      ...projectDocument,
      project,
      document,
    };
  },
});

export const getAll = query({
  args: {
    projectId: v.id("projects"),
    paginationOpts: v.optional(paginationOptsValidator),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    projectDocuments: (Doc<"projectDocuments"> & {
      document: Doc<"documents">;
    })[];
    project: Doc<"projects"> | null;
  }> => {
    await requireAuth(ctx);

    const project = await ctx.runQuery(api.routes.projects.get, {
      projectId: args.projectId,
    });
    if (!project) {
      throw new Error("Project not found");
    }

    const projectDocuments = await ctx.db
      .query("projectDocuments")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .paginate(args.paginationOpts ?? { numItems: 10, cursor: null });
    if (projectDocuments.page.length === 0) {
      return {
        projectDocuments: [],
        project: null,
      };
    }

    const documents = await ctx.runQuery(api.routes.documents.getMultiple, {
      documentIds: projectDocuments.page.map(
        (projectDocument) => projectDocument.documentId,
      ),
    });
    if (!documents) {
      throw new Error("Documents not found");
    }

    const projectDocumentsMap = new Map<
      Id<"projectDocuments">,
      Doc<"projectDocuments"> & { document: Doc<"documents"> }
    >();
    const documentMap = new Map<Id<"documents">, Doc<"documents">>();
    documents.forEach((document) => documentMap.set(document._id, document));

    projectDocuments.page.forEach((projectDocument) => {
      const document = documentMap.get(projectDocument.documentId);
      if (!document) {
        throw new Error("Document not found");
      }

      projectDocumentsMap.set(projectDocument._id, {
        ...projectDocument,
        document,
      });
    });

    return {
      projectDocuments: Array.from(projectDocumentsMap.values()),
      project,
    };
  },
});

export const getMultiple = query({
  args: {
    projectDocumentIds: v.array(v.id("projectDocuments")),
  },
  handler: async (
    ctx,
    args,
  ): Promise<
    (Doc<"projectDocuments"> & {
      project: Doc<"projects">;
      document: Doc<"documents">;
    })[]
  > => {
    await requireAuth(ctx);

    return await Promise.all(
      args.projectDocumentIds.map(async (projectDocumentId) => {
        const projectDocument = await ctx.runQuery(
          api.routes.projectDocuments.get,
          {
            projectDocumentId,
          },
        );
        if (!projectDocument) {
          throw new Error("Project document not found");
        }

        return projectDocument;
      }),
    );
  },
});

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    documentId: v.id("documents"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const project = await ctx.runQuery(api.routes.projects.get, {
      projectId: args.projectId,
    });
    if (!project) {
      throw new Error("Project not found");
    }

    const document = await ctx.runQuery(api.routes.documents.get, {
      documentId: args.documentId,
    });
    if (!document) {
      throw new Error("Document not found");
    }

    const projectDocument = await ctx.db.insert("projectDocuments", {
      projectId: args.projectId,
      documentId: args.documentId,
      selected: true,
      updatedAt: Date.now(),
    });

    return projectDocument;
  },
});

export const update = mutation({
  args: {
    projectDocumentId: v.id("projectDocuments"),
    update: v.object({
      selected: v.optional(v.boolean()),
    }),
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

    await ctx.db.patch(args.projectDocumentId, {
      ...args.update,
      updatedAt: Date.now(),
    });

    return true;
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

    await ctx.db.delete(args.projectDocumentId);
    return true;
  },
});

export const toggleSelect = mutation({
  args: {
    projectId: v.id("projects"),
    selected: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const project = await ctx.runQuery(api.routes.projects.get, {
      projectId: args.projectId,
    });
    if (!project) {
      throw new Error("Project not found");
    }

    const projectDocuments = await ctx.db
      .query("projectDocuments")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    await Promise.all(
      projectDocuments.map((projectDocument) =>
        ctx.runMutation(api.routes.projectDocuments.update, {
          projectDocumentId: projectDocument._id,
          update: { selected: args.selected },
        }),
      ),
    );

    return true;
  },
});
