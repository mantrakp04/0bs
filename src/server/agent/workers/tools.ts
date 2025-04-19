import { type RunnableConfig } from "@langchain/core/runnables";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js"
import { loadMcpTools } from "@langchain/mcp-adapters"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { Sandbox } from "@e2b/code-interpreter"
import { env } from "@/env";
import { db } from "@/server/db";
import { chats } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export const getTools = async (config: RunnableConfig) => {
  let sandbox: Sandbox;
  if (config.configurable?.manusSandboxId) {
    sandbox = await Sandbox.connect(config.configurable.manusSandboxId, { apiKey: env.E2B_API_KEY });
  } else {
    sandbox = await Sandbox.create({ apiKey: env.E2B_API_KEY });
    await db.update(chats)
      .set({
        manusSandboxId: sandbox.sandboxId,
        updatedAt: new Date(),
      })
      .where(eq(chats.id, config.configurable!.chatId))
      .execute();
  }
  
  const transport = new SSEClientTransport(new URL(`https://${sandbox.getHost(3000)}/sse`))
  const client = new Client({
    name: "manusmcp",
    version: "0.0.1",
    transport
  })
  await client.connect(transport)
  const tools = await loadMcpTools("tools", client)
  
  const shell_tools = ["shell_exec", "shell_view", "shell_wait", "shell_write_to_process", "shell_kill_process"]
  const fs_tools = ["file_read", "file_read_image", "file_write", "file_str_replace", "file_find_in_content", "file_find_by_name"]
  const browser_tools = ["browser_view", "browser_navigate", "browser_restart", "browser_click", "browser_input", "browser_move_mouse", "browser_press_key", "browser_select_option", "browser_scroll_up", "browser_scroll_down", "browser_console_exec", "browser_console_view"]

  const shell_toolkit = tools.filter(t => shell_tools.includes(t.name));
  const fs_toolkit = tools.filter(t => fs_tools.includes(t.name));
  const browser_toolkit = tools.filter(t => browser_tools.includes(t.name));
  return { shell_toolkit, fs_toolkit, browser_toolkit }
}
