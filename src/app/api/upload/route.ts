import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { env } from "@/env";
import { db } from "@/server/db";
import { sources } from "@/server/db/schema";

// Initialize S3 client for R2
export const s3Client = new S3Client({
  region: "auto",
  endpoint: env.S3_PUBLIC_URL,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
  },
});

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get form data
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files.length) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const uploadedSources = await Promise.all(
      files.map(async (file) => {
        // Generate unique key for the file
        const key = `${session.user.id}/${Date.now()}-${file.name}`;
        
        // Get file buffer
        const buffer = Buffer.from(await file.arrayBuffer());

        // Upload to R2
        const command = new PutObjectCommand({
          Bucket: env.S3_BUCKET_NAME,
          Key: key,
          Body: buffer,
          ContentType: file.type,
          Metadata: {
            userId: session.user.id,
          },
        });

        await s3Client.send(command);

        // Create source record in database
        const [source] = await db.insert(sources).values({
          name: file.name,
          key: key,
          type: file.type,
          size: file.size,
        }).returning();

        return {
          source,
          url: `${env.S3_PUBLIC_URL}/${key}`,
        };
      })
    );

    // Return success response
    return NextResponse.json({
      success: true,
      files: uploadedSources,
    });

  } catch (error) {
    console.error("Error handling file upload:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}

// Configure the API route to handle larger files
export const config = {
  api: {
    bodyParser: false,
  },
};