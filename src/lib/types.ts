import { Document } from "@langchain/core/documents";
import { sources } from "@/server/db/schema";

export type ProjectSourceMetadata = Partial<typeof sources.$inferInsert>;

export type ProjectSource = Document & { metadata: ProjectSourceMetadata };
