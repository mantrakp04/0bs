import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../utils/helpers";
import { paginationOptsValidator } from "convex/server";

export const get = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    const project = await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("_id"), args.projectId))
      .first();

    if (!project) {
      throw new Error("Project not found");
    }

    return project;
  },
});

export const getAll = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    const projects = await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .paginate(args.paginationOpts);

    return projects;
  },
});

export const getMultiple = query({
  args: {
    projectIds: v.array(v.id("projects")),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    const projects = await Promise.all(
      args.projectIds.map(async (projectId) => {
        const project = await ctx.db
          .query("projects")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .filter((q) => q.eq(q.field("_id"), projectId))
          .first();

        if (!project) {
          throw new Error("Project not found");
        }

        return project;
      }),
    );

    return projects;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    systemPrompt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    const newProjectId = await ctx.db.insert("projects", {
      name: args.name,
      description: args.description,
      systemPrompt: args.systemPrompt,
      userId: userId,
      updatedAt: Date.now(),
    });

    const newProject = await ctx.db.get(newProjectId);

    if (!newProject) {
      throw new Error("Project not found");
    }

    return newProject;
  },
});

export const update = mutation({
  args: {
    projectId: v.id("projects"),
    updates: v.object({
      name: v.optional(v.string()),
      description: v.optional(v.string()),
      systemPrompt: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    const existingProject = await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("_id"), args.projectId))
      .first();

    if (!existingProject) {
      throw new Error("Project not found");
    }

    await ctx.db.patch(existingProject._id, {
      ...args.updates,
      updatedAt: Date.now(),
    });

    return true;
  },
});

export const remove = mutation({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    const existingProject = await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("_id"), args.projectId))
      .first();

    if (!existingProject) {
      throw new Error("Project not found");
    }

    await ctx.db.delete(args.projectId);

    return true;
  },
});
