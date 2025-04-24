import { type RunnableConfig } from "@langchain/core/runnables";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"
import { loadMcpTools } from "@langchain/mcp-adapters"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"

const transport = new StdioClientTransport({
  command: "uv",
  args: ["run", "--project", "zerobs", "zerobs"],
})
const client = new Client({
  name: "zerobs",
  version: "0.0.1",
  transport
})
await client.connect(transport)
const tools = await loadMcpTools("tools", client)

export const getTools = async (config: RunnableConfig) => {
  
  const shell_tools = ["shell_exec", "shell_view", "shell_wait", "shell_write_to_process", "shell_kill_process"]
  const fs_tools = ["file_read", "file_read_image", "file_write", "file_str_replace", "file_find_in_content", "file_find_by_name"]
  const browser_tools = ["browser_view", "browser_navigate", "browser_restart", "browser_click", "browser_input", "browser_move_mouse", "browser_press_key", "browser_select_option", "browser_scroll_up", "browser_scroll_down", "browser_console_exec", "browser_console_view"]
  const code_interpreter_tools = ["add_markdown_cell", "add_execute_code_cell"]

  const shell_toolkit = tools.filter(t => shell_tools.includes(t.name));
  const fs_toolkit = tools.filter(t => fs_tools.includes(t.name));
  const browser_toolkit = tools.filter(t => browser_tools.includes(t.name));
  const code_interpreter_toolkit = tools.filter(t => code_interpreter_tools.includes(t.name));

  return { shell_toolkit, fs_toolkit, browser_toolkit, code_interpreter_toolkit }
}
