import { type Document } from "@langchain/core/documents";
import { type sources } from "@/server/db/schema";

export type ProjectSourceMetadata = Partial<typeof sources.$inferInsert>;

export type ProjectSource = Document & { metadata: ProjectSourceMetadata };
