import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { chats } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const chatRouter = createTRPCRouter({
  // Create a new chat
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).optional(),
      attachedProjectId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.insert(chats).values({
        name: input.name,
        attachedProjectId: input.attachedProjectId,
        createdById: ctx.userId,
      }).returning();
      return result[0];
    }),

  // Get all chats for the current user
  getAll: protectedProcedure
    .input(z.object({
      projectId: z.number().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      return await ctx.db.query.chats.findMany({
        where: (chats, { eq, and }) => {
          const conditions = [eq(chats.createdById, ctx.userId)];
          if (input?.projectId) {
            conditions.push(eq(chats.attachedProjectId, input.projectId));
          }
          return and(...conditions);
        },
        orderBy: (chats, { desc }) => [desc(chats.createdAt)],
        with: {
          createdBy: true,
          attachedProject: true,
        },
      });
    }),

  // Get a single chat by ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const chat = await ctx.db.query.chats.findFirst({
        where: (chats, { eq, and }) => and(
          eq(chats.id, input.id),
          eq(chats.createdById, ctx.userId)
        ),
        with: {
          createdBy: true,
          attachedProject: true,
        },
      });
      return chat;
    }),

  // Update a chat
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      attachedProjectId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify chat ownership
      const chat = await ctx.db.query.chats.findFirst({
        where: (chats, { eq }) => eq(chats.id, input.id),
      });
      
      if (!chat) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Chat with id ${input.id} not found`
        });
      }
      
      if (chat.createdById !== ctx.userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to update this chat'
        });
      }

      // If attaching to a project, verify project ownership
      if (input.attachedProjectId !== undefined) {
        const projectId = input.attachedProjectId;
        const project = await ctx.db.query.projects.findFirst({
          where: (projects, { eq }) => eq(projects.id, projectId),
        });
        
        if (!project) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: `Project with id ${projectId} not found`
          });
        }
        
        if (project.createdById !== ctx.userId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to attach this chat to the specified project'
          });
        }
      }

      const result = await ctx.db
        .update(chats)
        .set({
          name: input.name,
          attachedProjectId: input.attachedProjectId,
          updatedAt: new Date(),
        })
        .where(
          eq(chats.id, input.id)
        )
        .returning();
      return result[0];
    }),

  // Delete a chat
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Verify chat ownership
      const chat = await ctx.db.query.chats.findFirst({
        where: (chats, { eq }) => eq(chats.id, input.id),
      });
      
      if (!chat) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Chat with id ${input.id} not found`
        });
      }
      
      if (chat.createdById !== ctx.userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to delete this chat'
        });
      }

      await ctx.db
        .delete(chats)
        .where(
          eq(chats.id, input.id)
        );
      return { success: true };
    }),
});