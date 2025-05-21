import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";
import { StreamIdValidator } from "@convex-dev/persistent-text-streaming";

export default defineSchema({
  ...authTables,
  documents: defineTable({
    name: v.string(),
    type: v.union(
      v.literal("file"),
      v.literal("url"),
      v.literal("site"),
      v.id("documents"),
      v.literal("youtube"),
    ),
    size: v.number(),
    key: v.union(v.id("_storage"), v.string()),
    userId: v.id("users"),
  })
    .index("by_key", ["key"])
    .index("by_user", ["userId"]),
  chats: defineTable({
    name: v.string(),
    userId: v.id("users"),
    pinned: v.boolean(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_updated", ["userId", "updatedAt"]),
  chatInput: defineTable({
    chatId: v.union(v.id("chats"), v.literal("new")),
    userId: v.id("users"),
    documents: v.optional(v.array(v.id("documents"))),
    text: v.optional(v.string()),
    streamId: v.optional(StreamIdValidator),
    projectId: v.optional(v.id("projects")),
    model: v.optional(v.string()),
    agentMode: v.optional(v.boolean()),
    smortMode: v.optional(v.boolean()),
    webSearch: v.optional(v.boolean()),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_chat", ["chatId", "userId"])
    .index("by_stream", ["streamId"]),
  projects: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    systemPrompt: v.optional(v.string()),
    userId: v.id("users"),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_updated", ["userId", "updatedAt"]),
  projectDocuments: defineTable({
    projectId: v.id("projects"),
    documentId: v.id("documents"),
    selected: v.boolean(),
    updatedAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_project_document", ["projectId", "documentId"]),
  mcps: defineTable({
    name: v.string(),
    command: v.optional(v.string()),
    env: v.optional(v.record(v.string(), v.string())),
    url: v.optional(v.string()),
    status: v.optional(
      v.union(v.literal("running"), v.literal("stopped"), v.literal("error")),
    ),
    userId: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_updated", ["userId", "updatedAt"])
    .index("by_user_created", ["userId", "createdAt"])
    .index("by_status", ["status"]),

});
