import { relations } from "drizzle-orm";
import { index, pgTableCreator, timestamp } from "drizzle-orm/pg-core";
import { v4 as uuidv4 } from "uuid";
import { type instructions } from "@/server/agent/types";
/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator((name) => `0bs_${name}`);

export const sources = createTable(
  "source",
  (d) => ({
    id: d
      .text("id")
      .primaryKey()
      .$defaultFn(() => uuidv4()),
    name: d.text(),
    key: d.text(),
    type: d.text(),
    size: d.integer(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  }),
  (t) => ({
    keyTypeIdx: index("key_type_idx").on(t.key, t.type),
  }),
);

export const sourcesRelations = relations(sources, ({ many }) => ({
  projectSources: many(projectSources),
}));

export const chats = createTable(
  "chat",
  (d) => ({
    id: d
      .text("id")
      .primaryKey()
      .$defaultFn(() => uuidv4()),
    createdById: d.text().notNull(),
    name: d.text(),
    attachedProjectId: d
      .text("attachedProjectId")
      .references(() => projects.id),
    starred: d.integer().default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  }),
  (t) => ({
    createdByIdIdx: index("chat_created_by_id_idx").on(t.createdById),
    attachedProjectIdIdx: index("attached_project_id_idx").on(
      t.attachedProjectId,
    ),
  }),
);

export const chatsRelations = relations(chats, ({ one }) => ({
  attachedProject: one(projects, {
    fields: [chats.attachedProjectId],
    references: [projects.id],
  }),
}));

export const projects = createTable(
  "project",
  (d) => ({
    id: d
      .text("id")
      .primaryKey()
      .$defaultFn(() => uuidv4()),
    createdById: d.text().notNull(),
    name: d.text(),
    description: d.text(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  }),
  (t) => ({
    createdByIdIdx: index("project_created_by_id_idx").on(t.createdById),
  }),
);

export const projectSources = createTable(
  "project_source",
  (d) => ({
    id: d
      .text("id")
      .primaryKey()
      .$defaultFn(() => uuidv4()),
    projectId: d
      .text("projectId")
      .notNull()
      .references(() => projects.id),
    sourceId: d
      .text("sourceId")
      .notNull()
      .references(() => sources.id),
  }),
  (t) => ({
    projectIdIdx: index("project_id_idx").on(t.projectId),
    sourceIdIdx: index("source_id_idx").on(t.sourceId),
  }),
);

export const projectSourcesRelations = relations(projectSources, ({ one }) => ({
  project: one(projects, {
    fields: [projectSources.projectId],
    references: [projects.id],
  }),
  source: one(sources, {
    fields: [projectSources.sourceId],
    references: [sources.id],
  }),
}));

export const projectSourceIds = createTable(
  "project_source_ids",
  (d) => ({
    id: d
      .text("id")
      .primaryKey()
      .$defaultFn(() => uuidv4()),
    vectorId: d.text().notNull(),
    projectSourceId: d
      .text("projectSourceId")
      .notNull()
      .references(() => projectSources.id),
  }),
  (t) => ({
    projectSourceIdIdx: index("project_source_id_idx").on(t.projectSourceId),
  }),
);

export const projectSourceIdsRelations = relations(
  projectSourceIds,
  ({ one }) => ({
    projectSource: one(projectSources, {
      fields: [projectSourceIds.projectSourceId],
      references: [projectSources.id],
    }),
  }),
);

export const userMemory = createTable(
  "user_memory",
  (d) => ({
    id: d
      .text("id")
      .primaryKey()
      .$defaultFn(() => uuidv4()),
    userId: d.text().notNull(),
    memory: d.text("memory").$type<typeof instructions>(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  }),
  (t) => ({
    userIdIdx: index("user_id_idx").on(t.userId),
  }),
);
