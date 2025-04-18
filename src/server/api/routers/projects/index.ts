import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
} from "@/server/api/trpc";
import { db } from "@/server/db";
import { projects } from "@/server/db/schema";
import { sourcesRouter } from "@/server/api/routers/projects/sources";

const projectInput = z.object({
  name: z.string().min(1).max(256),
  description: z.string().optional(),
});

export const projectsRouter = createTRPCRouter({
  sources: sourcesRouter,
  
  getProjects: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(3),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      const userProjects = await db.query.projects.findMany({
        where: eq(projects.createdById, ctx.session.user.id),
        limit: input.limit,
        offset: input.offset,
        orderBy: desc(projects.createdAt),
      });
      return userProjects;
    }),

  getProject: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const project = await db.query.projects.findFirst({
        where: and(eq(projects.id, input.id), eq(projects.createdById, ctx.session.user.id)),
        with: {
          sources: true,
        },
      });

      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      return project;
    }),

  createProject: protectedProcedure
    .input(projectInput)
    .mutation(async ({ ctx, input }) => {
      const [project] = await ctx.db.insert(projects)
        .values({
          ...input,
          createdById: ctx.session.user.id,
        })
        .returning();
      return project;
    }),

  updateProject: protectedProcedure
    .input(z.object({
      id: z.number(),
      data: projectInput,
    }))
    .mutation(async ({ ctx, input }) => {
      const [project] = await ctx.db
        .update(projects)
        .set({
          ...input.data,
          updatedAt: new Date(),
        })
        .where(and(eq(projects.id, input.id), eq(projects.createdById, ctx.session.user.id)))
        .returning();

      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      return project;
    }),

  deleteProject: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const [project] = await ctx.db
        .delete(projects)
        .where(and(eq(projects.id, input.id), eq(projects.createdById, ctx.session.user.id)))
        .returning();

      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      return project;
    }),
});
