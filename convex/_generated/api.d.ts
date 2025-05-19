/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions_chat from "../actions/chat.js";
import type * as actions_mcps from "../actions/mcps.js";
import type * as actions_models from "../actions/models.js";
import type * as actions_projectDocuments from "../actions/projectDocuments.js";
import type * as auth from "../auth.js";
import type * as crons from "../crons.js";
import type * as http_chat from "../http/chat.js";
import type * as http from "../http.js";
import type * as langchain_agent_index from "../langchain/agent/index.js";
import type * as langchain_checkpointer from "../langchain/checkpointer.js";
import type * as langchain_get_mcp_tools from "../langchain/get_mcp_tools.js";
import type * as langchain_get_serch_tool from "../langchain/get_serch_tool.js";
import type * as langchain_models from "../langchain/models.js";
import type * as langchain_weaviate from "../langchain/weaviate.js";
import type * as routes_chatInput from "../routes/chatInput.js";
import type * as routes_chats from "../routes/chats.js";
import type * as routes_documents from "../routes/documents.js";
import type * as routes_mcps from "../routes/mcps.js";
import type * as routes_projectDocuments from "../routes/projectDocuments.js";
import type * as routes_projects from "../routes/projects.js";
import type * as utils_helpers from "../utils/helpers.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  "actions/chat": typeof actions_chat;
  "actions/mcps": typeof actions_mcps;
  "actions/models": typeof actions_models;
  "actions/projectDocuments": typeof actions_projectDocuments;
  auth: typeof auth;
  crons: typeof crons;
  "http/chat": typeof http_chat;
  http: typeof http;
  "langchain/agent/index": typeof langchain_agent_index;
  "langchain/checkpointer": typeof langchain_checkpointer;
  "langchain/get_mcp_tools": typeof langchain_get_mcp_tools;
  "langchain/get_serch_tool": typeof langchain_get_serch_tool;
  "langchain/models": typeof langchain_models;
  "langchain/weaviate": typeof langchain_weaviate;
  "routes/chatInput": typeof routes_chatInput;
  "routes/chats": typeof routes_chats;
  "routes/documents": typeof routes_documents;
  "routes/mcps": typeof routes_mcps;
  "routes/projectDocuments": typeof routes_projectDocuments;
  "routes/projects": typeof routes_projects;
  "utils/helpers": typeof utils_helpers;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {
  persistentTextStreaming: {
    lib: {
      addChunk: FunctionReference<
        "mutation",
        "internal",
        { final: boolean; streamId: string; text: string },
        any
      >;
      createStream: FunctionReference<"mutation", "internal", {}, any>;
      getStreamStatus: FunctionReference<
        "query",
        "internal",
        { streamId: string },
        "pending" | "streaming" | "done" | "error" | "timeout"
      >;
      getStreamText: FunctionReference<
        "query",
        "internal",
        { streamId: string },
        {
          status: "pending" | "streaming" | "done" | "error" | "timeout";
          text: string;
        }
      >;
      setStreamStatus: FunctionReference<
        "mutation",
        "internal",
        {
          status: "pending" | "streaming" | "done" | "error" | "timeout";
          streamId: string;
        },
        any
      >;
    };
  };
};
