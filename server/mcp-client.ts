import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { log } from "./index";

interface McpToolInfo {
  name: string;
  description?: string;
  inputSchema?: any;
}

interface McpConnectionState {
  connected: boolean;
  serverUrl: string;
  serverName?: string;
  serverVersion?: string;
  toolCount?: number;
}

class McpClientManager {
  private client: Client | null = null;
  private transport: SSEClientTransport | null = null;
  private tools: McpToolInfo[] = [];
  private serverUrl: string;
  private authToken: string | null = null;
  private serverName?: string;
  private serverVersion?: string;

  constructor() {
    this.serverUrl = process.env.MCP_SERVER_URL || "https://tallyprime-mcp-mqup2h4wzq-el.a.run.app/sse";
    this.authToken = process.env.MCP_AUTH_TOKEN || null;
  }

  setServerUrl(url: string): void {
    this.serverUrl = url;
  }

  setAuthToken(token: string | null): void {
    this.authToken = token;
  }

  getConfig(): { serverUrl: string; hasAuthToken: boolean } {
    return {
      serverUrl: this.serverUrl,
      hasAuthToken: !!this.authToken,
    };
  }

  async connect(url?: string, token?: string): Promise<McpConnectionState> {
    if (this.client) {
      await this.disconnect();
    }

    if (url) this.serverUrl = url;
    if (token !== undefined) this.authToken = token || null;

    try {
      log("Connecting to MCP server: " + this.serverUrl, "mcp");

      this.client = new Client(
        { name: "tally-mcp-client", version: "1.0.0" },
        { capabilities: {} }
      );

      const transportUrl = new URL(this.serverUrl);
      const headers: Record<string, string> = {};
      if (this.authToken) {
        const token = this.authToken.trim();
        headers["Authorization"] = token.toLowerCase().startsWith("bearer ")
          ? token
          : `Bearer ${token}`;
      }

      this.transport = new SSEClientTransport(transportUrl, {
        requestInit: {
          headers,
        },
        fetch: async (url, init) => {
          const merged = new Headers(init?.headers);
          for (const [key, value] of Object.entries(headers)) {
            merged.set(key, value);
          }
          let fetchUrl = new URL(String(url));
          if (init?.method === "POST" && !fetchUrl.pathname.endsWith("/")) {
            fetchUrl.pathname += "/";
          }
          return fetch(fetchUrl, {
            ...init,
            headers: merged,
          });
        },
      });

      await this.client.connect(this.transport);

      log("Connected to MCP server successfully", "mcp");

      const serverInfo = this.client.getServerVersion();
      this.serverName = serverInfo?.name || "Tally MCP Server";
      this.serverVersion = serverInfo?.version || "unknown";

      log(`Server: ${this.serverName} v${this.serverVersion}`, "mcp");

      await this.refreshTools();

      return this.getStatus();
    } catch (error: any) {
      log(`Failed to connect to MCP server: ${error.message}`, "mcp");
      this.client = null;
      this.transport = null;
      throw new Error(`Failed to connect: ${error.message}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.transport) {
      try {
        await this.transport.close();
      } catch (e) {
      }
    }
    this.client = null;
    this.transport = null;
    this.tools = [];
    this.serverName = undefined;
    this.serverVersion = undefined;
    log("Disconnected from MCP server", "mcp");
  }

  async refreshTools(): Promise<McpToolInfo[]> {
    if (!this.client) {
      throw new Error("Not connected to MCP server");
    }

    try {
      const result = await this.client.listTools();
      this.tools = (result.tools || []).map((t: any) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
      }));
      log(`Discovered ${this.tools.length} tools`, "mcp");
      return this.tools;
    } catch (error: any) {
      log(`Failed to list tools: ${error.message}`, "mcp");
      throw error;
    }
  }

  async executeTool(toolName: string, args: Record<string, any> = {}): Promise<any> {
    if (!this.client) {
      throw new Error("Not connected to MCP server");
    }

    log(`Executing tool: ${toolName} with args: ${JSON.stringify(args)}`, "mcp");

    try {
      const result = await this.client.callTool({ name: toolName, arguments: args });
      log(`Tool ${toolName} executed successfully`, "mcp");
      return result;
    } catch (error: any) {
      log(`Tool ${toolName} execution failed: ${error.message}`, "mcp");
      throw error;
    }
  }

  getTools(): McpToolInfo[] {
    return this.tools;
  }

  getStatus(): McpConnectionState {
    return {
      connected: this.client !== null,
      serverUrl: this.serverUrl,
      serverName: this.serverName,
      serverVersion: this.serverVersion,
      toolCount: this.tools.length,
    };
  }

  isConnected(): boolean {
    return this.client !== null;
  }
}

export const mcpClient = new McpClientManager();
