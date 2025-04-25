import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { projects } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { projectSourceRouter } from "@/server/api/routers/projectSource";

export const projectRouter = createTRPCRouter({
  source: projectSourceRouter,
  // Create a new project
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.insert(projects).values({
        name: input.name,
        description: input.description,
        createdById: ctx.userId,
      }).returning();
      return result[0];
    }),

  // Get all projects for the current user
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.query.projects.findMany({
      where: (projects, { eq }) => eq(projects.createdById, ctx.userId),
      orderBy: (projects, { desc }) => [desc(projects.createdAt)],
      with: {
        createdBy: true,
      },
    });
  }),

  // Get a single project by ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: (projects, { eq, and }) => and(
          eq(projects.id, input.id),
          eq(projects.createdById, ctx.userId)
        ),
        with: {
          createdBy: true,
        },
      });
      return project;
    }),

  // Update a project
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify project ownership
      const project = await ctx.db.query.projects.findFirst({
        where: (projects, { eq }) => eq(projects.id, input.id),
      });
      
      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Project with id ${input.id} not found`
        });
      }
      
      if (project.createdById !== ctx.userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to update this project'
        });
      }

      const result = await ctx.db
        .update(projects)
        .set({
          name: input.name,
          description: input.description,
          updatedAt: new Date(),
        })
        .where(
          eq(projects.id, input.id)
        )
        .returning();
      return result[0];
    }),

  // Delete a project
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Verify project ownership
      const project = await ctx.db.query.projects.findFirst({
        where: (projects, { eq }) => eq(projects.id, input.id),
      });
      
      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Project with id ${input.id} not found`
        });
      }
      
      if (project.createdById !== ctx.userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to delete this project'
        });
      }

      await ctx.db
        .delete(projects)
        .where(
          eq(projects.id, input.id)
        );
      return { success: true };
    }),
}); 