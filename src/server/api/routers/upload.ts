import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { projects } from "@/server/db/schema";
import { env } from "@/env";
import { TRPCError } from "@trpc/server";

// Initialize S3 client for R2
const s3Client = new S3Client({
  region: "auto",
  endpoint: env.S3_PUBLIC_URL,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
  },
});

export const uploadRouter = createTRPCRouter({
  // Get presigned URL for direct upload
  getPresignedUrl: protectedProcedure
    .input(z.object({
      fileName: z.string(),
      contentType: z.string(),
      projectId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // If a projectId is provided, verify that it belongs to the user
      if (input.projectId !== undefined) {
        const projectId = input.projectId;
        const project = await ctx.db.query.projects.findFirst({
          where: (projects, { eq }) => eq(projects.id, projectId),
        });
        
        if (!project) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: `Project with id ${input.projectId} not found`
          });
        }
        
        if (project.createdById !== ctx.session.user.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to upload to this project'
          });
        }
      }

      const key = `${ctx.session.user.id}/${input.projectId ?? "general"}/${Date.now()}-${input.fileName}`;
      
      const command = new PutObjectCommand({
        Bucket: env.S3_BUCKET_NAME,
        Key: key,
        ContentType: input.contentType,
        Metadata: {
          userId: ctx.session.user.id,
          projectId: input.projectId?.toString() ?? "none",
        },
      });

      try {
        await s3Client.send(command);
        
        return {
          success: true,
          key,
          url: `${env.S3_PUBLIC_URL}/${key}`,
        };
      } catch (error) {
        console.error("Error uploading to R2:", error);
        throw new Error("Failed to upload file");
      }
    }),
});