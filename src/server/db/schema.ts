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
      .notNull()
      .references(() => users.id),
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

export const postsRelations = relations(posts, ({ one }) => ({
  createdBy: one(users, { fields: [posts.createdById], references: [users.id] }),
}));

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
  createdById: d.text({ length: 255 }).notNull().references(() => users.id),
  name: d.text({ length: 255 }),
  attachedProjectId: d.integer({ mode: "number" }).references(() => projects.id),
  createdAt: d.integer({ mode: "timestamp" }).default(sql`(unixepoch())`),
  updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
}));

export const chatsRelations = relations(chats, ({ one }) => ({
  createdBy: one(users, { fields: [chats.createdById], references: [users.id] }),
  attachedProject: one(projects, { fields: [chats.attachedProjectId], references: [projects.id] }),
}));

export const projects = createTable("project", (d) => ({
  id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
  createdById: d.text({ length: 255 }).notNull().references(() => users.id),
  name: d.text({ length: 255 }),
  description: d.text(),
  createdAt: d.integer({ mode: "timestamp" }).default(sql`(unixepoch())`),
  updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
}));

export const projectsRelations = relations(projects, ({ one }) => ({
  createdBy: one(users, { fields: [projects.createdById], references: [users.id] }),
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

export const users = createTable("user", (d) => ({
  id: d
    .text({ length: 255 })
    .notNull()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: d.text({ length: 255 }),
  email: d.text({ length: 255 }).notNull(),
  emailVerified: d.integer({ mode: "timestamp" }).default(sql`(unixepoch())`),
  image: d.text({ length: 255 }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  posts: many(posts),
  projects: many(projects),
  chats: many(chats),
}));

export const accounts = createTable(
  "account",
  (d) => ({
    userId: d
      .text({ length: 255 })
      .notNull()
      .references(() => users.id),
    type: d.text({ length: 255 }).$type<AdapterAccount["type"]>().notNull(),
    provider: d.text({ length: 255 }).notNull(),
    providerAccountId: d.text({ length: 255 }).notNull(),
    refresh_token: d.text(),
    access_token: d.text(),
    expires_at: d.integer(),
    token_type: d.text({ length: 255 }),
    scope: d.text({ length: 255 }),
    id_token: d.text(),
    session_state: d.text({ length: 255 }),
  }),
  (t) => [
    primaryKey({
      columns: [t.provider, t.providerAccountId],
    }),
    index("account_user_id_idx").on(t.userId),
  ],
);

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessions = createTable(
  "session",
  (d) => ({
    sessionToken: d.text({ length: 255 }).notNull().primaryKey(),
    userId: d
      .text({ length: 255 })
      .notNull()
      .references(() => users.id),
    expires: d.integer({ mode: "timestamp" }).notNull(),
  }),
  (t) => [index("session_userId_idx").on(t.userId)],
);

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const verificationTokens = createTable(
  "verification_token",
  (d) => ({
    identifier: d.text({ length: 255 }).notNull(),
    token: d.text({ length: 255 }).notNull(),
    expires: d.integer({ mode: "timestamp" }).notNull(),
  }),
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);
