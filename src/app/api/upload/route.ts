import { PutObjectCommand } from '@aws-sdk/client-s3';
import { env } from '@/env';
import { NextResponse } from 'next/server';
import { auth } from '@/server/auth';
import { s3Client } from '@/lib/s3';
import type { ProjectSource, ProjectSourceMetadata } from '@/lib/types';

// Remove Unstructured import and create Docling processing function
async function processWithDocling(buffer: Buffer, fileName: string, fileType: string) {
  // Skip Docling processing for images
  if (fileType.startsWith('image/')) {
    return [{
      pageContent: '',
      metadata: {
        source: fileName,
      }
    }];
  }

  const formData = new FormData();
  const blob = new Blob([buffer], { type: 'application/octet-stream' });
  formData.append('files', blob, fileName);

  // Add default parameters - can be customized based on needs
  formData.append('to_formats', 'md');
  formData.append('image_export_mode', 'placeholder')
  
  const response = await fetch(`${env.DOCLING_API_URL}/v1alpha/convert/file`, {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(`Docling API error: ${JSON.stringify(errorData)}`);
  }
  
  const data = await response.json();
  
  if (data.status === 'failure') {
    throw new Error(`Docling processing failed: ${JSON.stringify(data.errors)}`);
  }
  
  // Transform Docling response to expected format
  const content = data.document.md_content || data.document.text_content || '';
  
  return [{
    pageContent: content,
    metadata: {
      source: fileName,
    }
  }];
}

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const key = `uploads/${session.user.id}/${crypto.randomUUID()}-${file.name}`;
    
    // Run S3 upload and Docling processing concurrently
    const [, docs] = await Promise.all([
      // Upload to R2
      s3Client.send(new PutObjectCommand({
        Bucket: env.R2_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: file.type,
      })),
      // Process with Docling
      processWithDocling(buffer, file.name, file.type)
    ]);
    
    const processedDocs = docs.map((doc) => ({
      ...doc,
      metadata: {
        ...doc.metadata,
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date(),
        userId: session.user.id,
        source: key,
      } as ProjectSourceMetadata,
    } as ProjectSource));

    return NextResponse.json({
      success: true,
      documents: processedDocs
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload file' },
      { status: 500 }
    );
  }
}