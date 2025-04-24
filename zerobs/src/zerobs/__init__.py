from .tools import mcp

def main():
    # Run the MCP server
    mcp.run(transport="stdio")

if __name__ == "__main__":
    main()