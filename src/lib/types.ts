import type { sources } from "@/server/db/schema";
import type { Document } from "@langchain/core/documents";

// Custom type for Langchain Document
export type LangchainDocument = Document & {
  pageContent: string;
  metadata: typeof sources.$inferSelect & {
    source: string;
    json_content: Record<string, any> | null;
    presignedUrl: string | null;
  };
}
