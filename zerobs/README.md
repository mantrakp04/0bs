# zerobs MCP server

A powerful MCP server project that provides shell execution, file management, browser automation, and Jupyter notebook integration capabilities.

## Components

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

To start Jupyter Lab:
```bash
jupyter lab --port 8888 --IdentityProvider.token zerobs --ip 0.0.0.0
```

## Quickstart

### Install

#### Claude Desktop

On MacOS: `~/Library/Application\ Support/Claude/claude_desktop_config.json`
On Windows: `%APPDATA%/Claude/claude_desktop_config.json`

<details>
  <summary>Development/Unpublished Servers Configuration</summary>
  ```
  "mcpServers": {
    "zerobs": {
      "command": "uv",
      "args": [
        "--directory",
        "/home/barrel/0bs/zerobs",
        "run",
        "zerobs"
      ]
    }
  }
  ```
</details>

<details>
  <summary>Published Servers Configuration</summary>
  ```
  "mcpServers": {
    "zerobs": {
      "command": "uvx",
      "args": [
        "zerobs"
      ]
    }
  }
  ```
</details>

## Development

### Building and Publishing

To prepare the package for distribution:

1. Sync dependencies and update lockfile:
```bash
uv sync
```

2. Build package distributions:
```bash
uv build
```

This will create source and wheel distributions in the `dist/` directory.

3. Publish to PyPI:
```bash
uv publish
```

Note: You'll need to set PyPI credentials via environment variables or command flags:
- Token: `--token` or `UV_PUBLISH_TOKEN`
- Or username/password: `--username`/`UV_PUBLISH_USERNAME` and `--password`/`UV_PUBLISH_PASSWORD`

### Debugging

Since MCP servers run over stdio, debugging can be challenging. For the best debugging
experience, we strongly recommend using the [MCP Inspector](https://github.com/modelcontextprotocol/inspector).

You can launch the MCP Inspector via [`npm`](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) with this command:

```bash
npx @modelcontextprotocol/inspector uv --directory /home/barrel/0bs/zerobs run zerobs
```

Upon launching, the Inspector will display a URL that you can access in your browser to begin debugging.