# zerobs MCP server

A powerful MCP server project that provides shell execution, file management, browser automation, and Jupyter notebook integration capabilities.

## Components

## Run

```bash
uv run zerobs
```

### Resources

The server implements a simple note storage system with:
- Custom note:// URI scheme for accessing individual notes
- Each note resource has a name, description and text/plain mimetype

### Prompts

The server provides a single prompt:
- summarize-notes: Creates summaries of all stored notes
  - Optional "style" argument to control detail level (brief/detailed)
  - Generates prompt combining all current notes with style preference

### Tools

The server implements several categories of tools:

#### Shell Management
- `shell_exec`: Execute commands in a shell session
- `shell_view`: View shell session output
- `shell_wait`: Wait for process completion
- `shell_write_to_process`: Write input to running process
- `shell_kill_process`: Terminate running process

#### File Operations
- `file_read`: Read file content with optional line range
- `file_read_image`: Read image files
- `file_write`: Write or append content to files
- `file_str_replace`: Replace strings in files
- `file_find_in_content`: Search file content using regex
- `file_find_by_name`: Find files by name pattern

#### Browser Automation
- `browser_view`: View current page content and screenshot
- `browser_navigate`: Navigate to URL
- `browser_restart`: Restart browser session
- `browser_click`: Click elements by index or coordinates
- `browser_input`: Input text into elements
- `browser_move_mouse`: Move mouse cursor
- `browser_press_key`: Simulate keyboard input
- `browser_select_option`: Select dropdown options
- `browser_scroll_up/down`: Scroll page
- `browser_console_exec`: Execute JavaScript
- `browser_console_view`: View browser console logs

#### Jupyter Integration
- `add_markdown_cell`: Add markdown cells to notebook
- `add_execute_code_cell`: Add and execute code cells

## Configuration

The server uses the following default configuration:

- Server URL: http://localhost:8888
- Authentication Token: zerobs
- Base Data Directory: /tmp/mcp/data
- Next Data Directory: /tmp/mcp/next
- Notebook Path: /tmp/mcp/data/notebook.ipynb
