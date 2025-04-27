import { relations, sql } from "drizzle-orm";
import { sqliteTableCreator } from "drizzle-orm/sqlite-core";
import { randomUUID } from "crypto";
import { instructions } from "@/server/agent/types";
/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = sqliteTableCreator((name) => `0bs_${name}`);

export const sources = createTable("source", (d) => ({
  id: d.text("id").primaryKey().$defaultFn(() => randomUUID()),
  name: d.text({ length: 255 }),
  key: d.text({ length: 255 }),
  type: d.text({ length: 255 }),
  size: d.integer({ mode: "number" }),
  createdAt: d.integer({ mode: "timestamp" }).default(sql`(unixepoch())`),
  updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
}));

export const sourcesRelations = relations(sources, ({ many }) => ({
  projectSources: many(projectSources),
}));

export const chats = createTable("chat", (d) => ({
  id: d.text("id").primaryKey().$defaultFn(() => randomUUID()),
  createdById: d.text({ length: 255 }).notNull(),
  name: d.text({ length: 255 }),
  attachedProjectId: d.text("attachedProjectId").references(() => projects.id),
  starred: d.integer({ mode: "number" }).default(0),
  createdAt: d.integer({ mode: "timestamp" }).default(sql`(unixepoch())`),
  updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
}));

export const chatsRelations = relations(chats, ({ one }) => ({
  attachedProject: one(projects, { fields: [chats.attachedProjectId], references: [projects.id] }),
}));

export const projects = createTable("project", (d) => ({
  id: d.text("id").primaryKey().$defaultFn(() => randomUUID()),
  createdById: d.text({ length: 255 }).notNull(),
  name: d.text({ length: 255 }),
  description: d.text(),
  createdAt: d.integer({ mode: "timestamp" }).default(sql`(unixepoch())`),
  updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
}));

export const projectSources = createTable("project_source", (d) => ({
  id: d.text("id").primaryKey().$defaultFn(() => randomUUID()),
  projectId: d.text("projectId").notNull().references(() => projects.id),
  sourceId: d.text("sourceId").notNull().references(() => sources.id),
}));

export const projectSourcesRelations = relations(projectSources, ({ one }) => ({
  project: one(projects, { fields: [projectSources.projectId], references: [projects.id] }),
  source: one(sources, { fields: [projectSources.sourceId], references: [sources.id] }),
}));

export const projectSourceIds = createTable("project_source_ids", (d) => ({
  id: d.text("id").primaryKey().$defaultFn(() => randomUUID()),
  vectorId: d.text({ length: 255 }).notNull(),
  projectSourceId: d.text("projectSourceId").notNull().references(() => projectSources.id),
}));

export const projectSourceIdsRelations = relations(projectSourceIds, ({ one }) => ({
  projectSource: one(projectSources, { fields: [projectSourceIds.projectSourceId], references: [projectSources.id] }),
}));

export const userMemory = createTable("user_memory", (d) => ({
  id: d.text("id").primaryKey().$defaultFn(() => randomUUID()),
  userId: d.text({ length: 255 }).notNull(),
  memory: d.text("memory").$type<typeof instructions>(),
  createdAt: d.integer({ mode: "timestamp" }).default(sql`(unixepoch())`),
  updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
}));