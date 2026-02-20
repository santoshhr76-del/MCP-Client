# Tally MCP Client

## Overview
A web-based MCP (Model Context Protocol) client that connects to a cloud-hosted Tally MCP server via SSE transport. Users can discover available tools, execute them with parameters, and view execution history.

## Architecture
- **Frontend**: React + Vite + TailwindCSS + shadcn/ui components
- **Backend**: Express server that manages the MCP client connection
- **MCP Transport**: SSE (Server-Sent Events) using `@modelcontextprotocol/sdk`
- **Storage**: In-memory storage for tool execution history

## Key Files
- `server/mcp-client.ts` - MCP client manager (connect, disconnect, list tools, execute)
- `server/routes.ts` - API routes for MCP operations
- `server/storage.ts` - In-memory storage for execution history
- `shared/schema.ts` - Data models and TypeScript types
- `client/src/pages/dashboard.tsx` - Dashboard with connection status and recent activity
- `client/src/pages/tools.tsx` - Tool browser and executor
- `client/src/pages/history.tsx` - Execution history viewer
- `client/src/components/app-sidebar.tsx` - Navigation sidebar

## API Endpoints
- `GET /api/mcp/status` - Connection status
- `POST /api/mcp/connect` - Connect to MCP server
- `POST /api/mcp/disconnect` - Disconnect from MCP server
- `GET /api/mcp/tools` - List available tools
- `POST /api/mcp/tools/refresh` - Refresh tool list
- `POST /api/mcp/execute` - Execute a tool (body: { toolName, arguments })
- `GET /api/mcp/history` - Get execution history

## Environment Variables
- `MCP_SERVER_URL` - URL of the Tally MCP server SSE endpoint
- `MCP_AUTH_TOKEN` - Bearer token for MCP server authentication
- `TALLY_URL` - Default TallyPrime Gateway URL (can also be set via Settings UI)

## Recent Changes
- 2026-02-20: Added global TallyPrime URL setting (auto-injected into all tool calls, hidden from tool parameter forms)
- 2026-02-20: Auto-reconnect and stale SSE connection handling
- 2026-02-19: Initial build of Tally MCP Client with dashboard, tools explorer, and history views
