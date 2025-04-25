import { relations, sql } from "drizzle-orm";
import { index, primaryKey, sqliteTableCreator } from "drizzle-orm/sqlite-core";
import { type AdapterAccount } from "next-auth/adapters";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = sqliteTableCreator((name) => `0bs_${name}`);

export const posts = createTable(
  "post",
  (d) => ({
    id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    name: d.text({ length: 256 }),
    createdById: d
      .text({ length: 255 })
      .notNull(),
    createdAt: d
      .integer({ mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("created_by_idx").on(t.createdById),
    index("name_idx").on(t.name),
  ],
);

export const sources = createTable("source", (d) => ({
  id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
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
  id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
  createdById: d.text({ length: 255 }).notNull(),
  name: d.text({ length: 255 }),
  attachedProjectId: d.integer({ mode: "number" }).references(() => projects.id),
  createdAt: d.integer({ mode: "timestamp" }).default(sql`(unixepoch())`),
  updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
}));

export const chatsRelations = relations(chats, ({ one }) => ({
  attachedProject: one(projects, { fields: [chats.attachedProjectId], references: [projects.id] }),
}));

export const projects = createTable("project", (d) => ({
  id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
  createdById: d.text({ length: 255 }).notNull(),
  name: d.text({ length: 255 }),
  description: d.text(),
  createdAt: d.integer({ mode: "timestamp" }).default(sql`(unixepoch())`),
  updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
}));

export const projectSources = createTable("project_source", (d) => ({
  id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
  projectId: d.integer({ mode: "number" }).notNull().references(() => projects.id),
  sourceId: d.integer({ mode: "number" }).notNull().references(() => sources.id),
}));

export const projectSourcesRelations = relations(projectSources, ({ one }) => ({
  project: one(projects, { fields: [projectSources.projectId], references: [projects.id] }),
  source: one(sources, { fields: [projectSources.sourceId], references: [sources.id] }),
}));

export const projectSourceIds = createTable("project_source_ids", (d) => ({
  id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
  vectorId: d.text({ length: 255 }).notNull(),
  projectSourceId: d.integer({ mode: "number" }).notNull().references(() => projectSources.id),
}));

export const projectSourceIdsRelations = relations(projectSourceIds, ({ one }) => ({
  projectSource: one(projectSources, { fields: [projectSourceIds.projectSourceId], references: [projectSources.id] }),
}));
