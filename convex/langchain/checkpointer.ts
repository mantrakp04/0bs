import {
  BaseCheckpointSaver,
  type Checkpoint,
  type CheckpointListOptions,
  type CheckpointTuple,
  type SerializerProtocol,
  type PendingWrite,
  type CheckpointMetadata,
  type ChannelVersions,
  WRITES_IDX_MAP,
  TASKS,
} from "@langchain/langgraph-checkpoint";
import type { RunnableConfig } from "@langchain/core/runnables";
import {
  type MutationCtx,
  type QueryCtx,
  internalMutation,
  internalQuery,
} from "../_generated/server";
import { v } from "convex/values";

/**
 * LangGraph checkpointer that uses Convex as the backing store.
 *
 * @example
 * ```
 * import { ChatOpenAI } from "@langchain/openai";
 * import { ConvexSaver } from "./lib/checkpointer";
 * import { createReactAgent } from "@langchain/langgraph/prebuilt";
 *
 * const checkpointer = new ConvexSaver();
 *
 * const graph = createReactAgent({
 *   tools: [getWeather],
 *   llm: new ChatOpenAI({
 *     model: "gpt-4o-mini",
 *   }),
 *   checkpointSaver: checkpointer,
 * });
 *
 * const config = { configurable: { thread_id: "1" } };
 *
 * await graph.invoke({
 *   messages: [{
 *     role: "user",
 *     content: "what's the weather in sf"
 *   }],
 * }, config);
 * ```
 */
export class ConvexSaver extends BaseCheckpointSaver {
  protected ctx?: QueryCtx | MutationCtx;

  constructor(serde?: SerializerProtocol) {
    super(serde);
  }

  /**
   * Set the Convex context for database operations.
   * This must be called before any database operations.
   */
  setContext(ctx: QueryCtx | MutationCtx) {
    this.ctx = ctx;
  }

  /**
   * Checks if the context is a MutationCtx
   */
  private isMutationCtx(ctx: QueryCtx | MutationCtx): ctx is MutationCtx {
    return "db" in ctx && "insert" in (ctx.db as any);
  }

  protected async _loadCheckpoint(
    checkpoint: Omit<Checkpoint, "pending_sends" | "channel_values">,
    channelValues: [Uint8Array, Uint8Array, Uint8Array][],
    pendingSends: [Uint8Array, Uint8Array][],
  ): Promise<Checkpoint> {
    return {
      ...checkpoint,
      pending_sends: await Promise.all(
        (pendingSends || []).map(([c, b]) =>
          this.serde.loadsTyped(c.toString(), b),
        ),
      ),
      channel_values: await this._loadBlobs(channelValues),
    };
  }

  protected async _loadBlobs(
    blobValues: [Uint8Array, Uint8Array, Uint8Array][],
  ): Promise<Record<string, unknown>> {
    if (!blobValues || blobValues.length === 0) {
      return {};
    }
    const entries = await Promise.all(
      blobValues
        .filter(([, t]) => new TextDecoder().decode(t) !== "empty")
        .map(async ([k, t, v]) => [
          new TextDecoder().decode(k),
          await this.serde.loadsTyped(new TextDecoder().decode(t), v),
        ]),
    );
    return Object.fromEntries(entries);
  }

  protected async _loadMetadata(metadata: Record<string, unknown>) {
    const [type, dumpedValue] = this.serde.dumpsTyped(metadata);
    return this.serde.loadsTyped(type, dumpedValue);
  }

  protected async _loadWrites(
    writes: [Uint8Array, Uint8Array, Uint8Array, Uint8Array][],
  ): Promise<[string, string, unknown][]> {
    const decoder = new TextDecoder();
    return writes
      ? await Promise.all(
          writes.map(async ([tid, channel, t, v]) => [
            decoder.decode(tid),
            decoder.decode(channel),
            await this.serde.loadsTyped(decoder.decode(t), v),
          ]),
        )
      : [];
  }

  protected _dumpBlobs(
    threadId: string,
    checkpointNs: string,
    values: Record<string, unknown>,
    versions: ChannelVersions,
  ): {
    threadId: string;
    checkpointNs: string;
    channel: string;
    version: string;
    type: string;
    blob: Uint8Array | null;
  }[] {
    if (Object.keys(versions).length === 0) {
      return [];
    }

    return Object.entries(versions).map(([k, ver]) => {
      const [type, value] =
        k in values ? this.serde.dumpsTyped(values[k]) : ["empty", null];
      return {
        threadId,
        checkpointNs,
        channel: k,
        version: ver.toString(),
        type,
        blob: value ? new Uint8Array(value) : null,
      };
    });
  }

  protected _dumpCheckpoint(checkpoint: Checkpoint) {
    const serialized: Record<string, unknown> = {
      ...checkpoint,
      pending_sends: [],
    };
    if ("channel_values" in serialized) {
      delete serialized.channel_values;
    }
    return serialized;
  }

  protected _dumpMetadata(metadata: CheckpointMetadata) {
    const [, serializedMetadata] = this.serde.dumpsTyped(metadata);
    // We need to remove null characters before writing
    return JSON.parse(
      new TextDecoder().decode(serializedMetadata).replace(/\0/g, ""),
    );
  }

  protected _dumpWrites(
    threadId: string,
    checkpointNs: string,
    checkpointId: string,
    taskId: string,
    writes: [string, unknown][],
  ): {
    threadId: string;
    checkpointNs: string;
    checkpointId: string;
    taskId: string;
    idx: number;
    channel: string;
    type: string;
    blob: Uint8Array;
  }[] {
    return writes.map(([channel, value], idx) => {
      const [type, serializedValue] = this.serde.dumpsTyped(value);
      return {
        threadId,
        checkpointNs,
        checkpointId,
        taskId,
        idx:
          WRITES_IDX_MAP[channel] !== undefined ? WRITES_IDX_MAP[channel] : idx,
        channel,
        type,
        blob: new Uint8Array(serializedValue),
      };
    });
  }

  /**
   * Get a checkpoint tuple from the database.
   * This method retrieves a checkpoint tuple from the Convex database
   * based on the provided config.
   */
  async getTuple(config: RunnableConfig): Promise<CheckpointTuple | undefined> {
    if (!this.ctx) {
      throw new Error("Convex context not set. Call setContext() first.");
    }

    const {
      thread_id,
      checkpoint_ns = "",
      checkpoint_id,
    } = config.configurable ?? {};

    let checkpoint;

    if (checkpoint_id) {
      checkpoint = await this.ctx.db
        .query("checkpoints")
        .filter(
          (q) =>
            q.eq("threadId", thread_id) &&
            q.eq("checkpointNs", checkpoint_ns) &&
            q.eq("checkpointId", checkpoint_id),
        )
        .first();
    } else {
      checkpoint = await this.ctx.db
        .query("checkpoints")
        .filter(
          (q) =>
            q.eq("threadId", thread_id) && q.eq("checkpointNs", checkpoint_ns),
        )
        .order("desc")
        .first();
    }

    if (!checkpoint) {
      return undefined;
    }

    // Get channel values
    const channelVersionsEntries = Object.entries(
      checkpoint.checkpoint.channel_versions || {},
    );
    const channelValues: [Uint8Array, Uint8Array, Uint8Array][] = [];

    for (const [channel, version] of channelVersionsEntries) {
      const blob = await this.ctx.db
        .query("checkpointBlobs")
        .filter(
          (q) =>
            q.eq("threadId", thread_id) &&
            q.eq("checkpointNs", checkpoint_ns) &&
            q.eq("channel", channel) &&
            q.eq("version", version?.toString()),
        )
        .first();

      if (blob) {
        const encoder = new TextEncoder();
        channelValues.push([
          encoder.encode(channel),
          encoder.encode(blob.type),
          blob.blob ? new Uint8Array(blob.blob) : new Uint8Array(),
        ]);
      }
    }

    // Get pending writes
    const writes = await this.ctx.db
      .query("checkpointWrites")
      .filter(
        (q) =>
          q.eq("threadId", thread_id) &&
          q.eq("checkpointNs", checkpoint_ns) &&
          q.eq("checkpointId", checkpoint.checkpointId),
      )
      .collect();

    writes.sort((a, b) => {
      if (a.taskId !== b.taskId) return a.taskId.localeCompare(b.taskId);
      return a.idx - b.idx;
    });

    const pendingWrites: [Uint8Array, Uint8Array, Uint8Array, Uint8Array][] =
      writes.map((write) => {
        const encoder = new TextEncoder();
        return [
          encoder.encode(write.taskId),
          encoder.encode(write.channel),
          encoder.encode(write.type),
          new Uint8Array(write.blob),
        ];
      });

    // Get pending sends
    const pendingSends: [Uint8Array, Uint8Array][] = [];
    if (checkpoint.parentCheckpointId) {
      const sends = await this.ctx.db
        .query("checkpointWrites")
        .filter(
          (q) =>
            q.eq("threadId", thread_id) &&
            q.eq("checkpointNs", checkpoint_ns) &&
            q.eq("checkpointId", checkpoint.parentCheckpointId) &&
            q.eq("channel", TASKS),
        )
        .collect();

      sends.sort((a, b) => a.idx - b.idx);

      for (const send of sends) {
        const encoder = new TextEncoder();
        pendingSends.push([
          encoder.encode(send.type),
          new Uint8Array(send.blob),
        ]);
      }
    }

    const loadedCheckpoint = await this._loadCheckpoint(
      checkpoint.checkpoint,
      channelValues,
      pendingSends,
    );

    const finalConfig = {
      configurable: {
        thread_id,
        checkpoint_ns,
        checkpoint_id: checkpoint.checkpointId,
      },
    };

    const metadata = await this._loadMetadata(checkpoint.metadata);

    const parentConfig = checkpoint.parentCheckpointId
      ? {
          configurable: {
            thread_id,
            checkpoint_ns,
            checkpoint_id: checkpoint.parentCheckpointId,
          },
        }
      : undefined;

    const loadedPendingWrites = await this._loadWrites(pendingWrites);

    return {
      config: finalConfig,
      checkpoint: loadedCheckpoint,
      metadata,
      parentConfig,
      pendingWrites: loadedPendingWrites,
    };
  }

  /**
   * List checkpoints from the database.
   */
  async *list(
    config: RunnableConfig,
    options?: CheckpointListOptions,
  ): AsyncGenerator<CheckpointTuple> {
    if (!this.ctx) {
      throw new Error("Convex context not set. Call setContext() first.");
    }

    const { filter, before, limit } = options ?? {};
    const { thread_id, checkpoint_ns = "" } = config.configurable ?? {};

    let query = this.ctx.db
      .query("checkpoints")
      .filter(
        (q) =>
          q.eq("threadId", thread_id) && q.eq("checkpointNs", checkpoint_ns),
      );

    if (config.configurable?.checkpoint_id) {
      query = query.filter((q) =>
        q.eq("checkpointId", config.configurable?.checkpoint_id || ""),
      );
    }

    if (before?.configurable?.checkpoint_id) {
      query = query.filter((q) =>
        q.lt("checkpointId", before.configurable?.checkpoint_id || ""),
      );
    }

    // For filter, we need to check metadata fields
    if (filter && Object.keys(filter).length > 0) {
      // Add a filter for metadata matching using object containment
      query = query.filter((q) => q.eq(q.field("metadata"), { ...filter }));
    }

    const checkpoints = await query
      .order("desc")
      .take(limit !== undefined ? parseInt(limit.toString(), 10) : 100); // Default to 100

    for (const checkpoint of checkpoints) {
      // Reuse getTuple logic for each checkpoint
      const checkpointConfig = {
        configurable: {
          thread_id,
          checkpoint_ns,
          checkpoint_id: checkpoint.checkpointId,
        },
      };

      const tuple = await this.getTuple(checkpointConfig);
      if (tuple) {
        yield tuple;
      }
    }
  }

  /**
   * Save a checkpoint to the database.
   */
  async put(
    config: RunnableConfig,
    checkpoint: Checkpoint,
    metadata: CheckpointMetadata,
    newVersions: ChannelVersions,
  ): Promise<RunnableConfig> {
    if (!this.ctx) {
      throw new Error("Convex context not set. Call setContext() first.");
    }

    if (!this.isMutationCtx(this.ctx)) {
      throw new Error("Operation requires a mutation context");
    }

    if (config.configurable === undefined) {
      throw new Error(`Missing "configurable" field in "config" param`);
    }

    const {
      thread_id,
      checkpoint_ns = "",
      checkpoint_id,
    } = config.configurable;

    const nextConfig = {
      configurable: {
        thread_id,
        checkpoint_ns,
        checkpoint_id: checkpoint.id,
      },
    };

    const serializedCheckpoint = this._dumpCheckpoint(checkpoint);
    const serializedBlobs = this._dumpBlobs(
      thread_id,
      checkpoint_ns,
      checkpoint.channel_values,
      newVersions,
    );

    // Store blobs first
    for (const blob of serializedBlobs) {
      // Use upsert pattern: find then update or insert
      const existingBlob = await this.ctx.db
        .query("checkpointBlobs")
        .filter(
          (q) =>
            q.eq("threadId", blob.threadId) &&
            q.eq("checkpointNs", blob.checkpointNs) &&
            q.eq("channel", blob.channel) &&
            q.eq("version", blob.version),
        )
        .first();

      if (existingBlob) {
        // Skip if already exists
        continue;
      }

      // Insert new blob
      await this.ctx.db.insert("checkpointBlobs", {
        threadId: blob.threadId,
        checkpointNs: blob.checkpointNs,
        channel: blob.channel,
        version: blob.version,
        type: blob.type,
        blob: blob.blob ? Array.from(blob.blob) : undefined,
      });
    }

    // Store checkpoint
    const existingCheckpoint = await this.ctx.db
      .query("checkpoints")
      .filter(
        (q) =>
          q.eq("threadId", thread_id) &&
          q.eq("checkpointNs", checkpoint_ns) &&
          q.eq("checkpointId", checkpoint.id),
      )
      .first();

    if (existingCheckpoint) {
      // Update existing checkpoint
      await this.ctx.db.patch(existingCheckpoint._id, {
        checkpoint: serializedCheckpoint,
        metadata: this._dumpMetadata(metadata),
      });
    } else {
      // Insert new checkpoint
      await this.ctx.db.insert("checkpoints", {
        threadId: thread_id,
        checkpointNs: checkpoint_ns,
        checkpointId: checkpoint.id,
        parentCheckpointId: checkpoint_id,
        checkpoint: serializedCheckpoint,
        metadata: this._dumpMetadata(metadata),
        createdAt: Date.now(),
      });
    }

    return nextConfig;
  }

  /**
   * Store intermediate writes linked to a checkpoint.
   */
  async putWrites(
    config: RunnableConfig,
    writes: PendingWrite[],
    taskId: string,
  ): Promise<void> {
    if (!this.ctx) {
      throw new Error("Convex context not set. Call setContext() first.");
    }

    if (!this.isMutationCtx(this.ctx)) {
      throw new Error("Operation requires a mutation context");
    }

    const dumpedWrites = this._dumpWrites(
      config.configurable?.thread_id ?? "",
      config.configurable?.checkpoint_ns ?? "",
      config.configurable?.checkpoint_id ?? "",
      taskId,
      writes,
    );

    for (const write of dumpedWrites) {
      // Use upsert pattern based on key fields
      const existingWrite = await this.ctx.db
        .query("checkpointWrites")
        .filter(
          (q) =>
            q.eq("threadId", write.threadId) &&
            q.eq("checkpointNs", write.checkpointNs) &&
            q.eq("checkpointId", write.checkpointId) &&
            q.eq("taskId", write.taskId) &&
            q.eq("idx", write.idx as any),
        )
        .first();

      if (existingWrite) {
        // If all channels are in WRITES_IDX_MAP, we update existing records
        if (writes.every((w) => w[0] in WRITES_IDX_MAP)) {
          await this.ctx.db.patch(existingWrite._id, {
            channel: write.channel,
            type: write.type,
            blob: Array.from(write.blob),
          });
        }
        // Otherwise we skip existing records
        continue;
      }

      // Insert new write
      await this.ctx.db.insert("checkpointWrites", {
        threadId: write.threadId,
        checkpointNs: write.checkpointNs,
        checkpointId: write.checkpointId,
        taskId: write.taskId,
        idx: write.idx,
        channel: write.channel,
        type: write.type,
        blob: Array.from(write.blob),
      });
    }
  }
}

// Convex mutations and queries for using the checkpointer

/**
 * Creates a checkpoint in the database.
 */
export const createCheckpoint = internalMutation({
  args: {
    config: v.any(),
    checkpoint: v.any(),
    metadata: v.any(),
    newVersions: v.any(),
  },
  handler: async (ctx, args) => {
    const saver = new ConvexSaver();
    saver.setContext(ctx);
    return await saver.put(
      args.config as RunnableConfig,
      args.checkpoint as Checkpoint,
      args.metadata as CheckpointMetadata,
      args.newVersions as ChannelVersions,
    );
  },
});

/**
 * Gets a checkpoint from the database.
 */
export const getCheckpoint = internalQuery({
  args: { config: v.any() },
  handler: async (ctx, args) => {
    const saver = new ConvexSaver();
    saver.setContext(ctx);
    return await saver.getTuple(args.config as RunnableConfig);
  },
});

/**
 * Stores writes for a checkpoint.
 */
export const storeWrites = internalMutation({
  args: {
    config: v.any(),
    writes: v.any(),
    taskId: v.string(),
  },
  handler: async (ctx, args) => {
    const saver = new ConvexSaver();
    saver.setContext(ctx);
    await saver.putWrites(
      args.config as RunnableConfig,
      args.writes as PendingWrite[],
      args.taskId,
    );
    return { success: true };
  },
});

/**
 * Lists checkpoints.
 */
export const listCheckpoints = internalQuery({
  args: {
    config: v.any(),
    options: v.any(),
  },
  handler: async (ctx, args) => {
    const saver = new ConvexSaver();
    saver.setContext(ctx);

    const checkpoints: CheckpointTuple[] = [];
    const generator = saver.list(
      args.config as RunnableConfig,
      args.options as CheckpointListOptions,
    );

    for await (const checkpoint of generator) {
      checkpoints.push(checkpoint);
    }

    return checkpoints;
  },
});
