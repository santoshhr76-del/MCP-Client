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
  private tallyUrl: string = "";
  private serverName?: string;
  private serverVersion?: string;
  private reconnecting = false;
  private lastSuccessfulCall = 0;

  constructor() {
    this.serverUrl = process.env.MCP_SERVER_URL || "https://tallyprime-mcp-mqup2h4wzq-el.a.run.app/sse";
    this.authToken = process.env.MCP_AUTH_TOKEN || null;
    this.tallyUrl = process.env.TALLY_URL || "";
  }

  setServerUrl(url: string): void {
    this.serverUrl = url;
  }

  setAuthToken(token: string | null): void {
    this.authToken = token;
  }

  setTallyUrl(url: string): void {
    this.tallyUrl = url;
  }

  getConfig(): { serverUrl: string; hasAuthToken: boolean; tallyUrl: string } {
    return {
      serverUrl: this.serverUrl,
      hasAuthToken: !!this.authToken,
      tallyUrl: this.tallyUrl,
    };
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    if (this.authToken) {
      const token = this.authToken.trim();
      headers["Authorization"] = token.toLowerCase().startsWith("bearer ")
        ? token
        : `Bearer ${token}`;
    }
    return headers;
  }

  private createTransport(): SSEClientTransport {
    const transportUrl = new URL(this.serverUrl);
    const headers = this.buildHeaders();

    return new SSEClientTransport(transportUrl, {
      requestInit: { headers },
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

      this.transport = this.createTransport();

      this.transport.onerror = (error) => {
        log(`SSE transport error: ${error.message}`, "mcp");
        this.handleConnectionLost();
      };

      this.transport.onclose = () => {
        log("SSE transport closed", "mcp");
        this.handleConnectionLost();
      };

      await this.client.connect(this.transport);

      log("Connected to MCP server successfully", "mcp");
      this.lastSuccessfulCall = Date.now();

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

  private handleConnectionLost(): void {
    if (this.reconnecting) return;
    log("Connection lost, marking as disconnected", "mcp");
    this.client = null;
    this.transport = null;
  }

  private async reconnect(): Promise<boolean> {
    if (this.reconnecting) return false;
    this.reconnecting = true;
    try {
      log("Attempting automatic reconnect...", "mcp");
      this.client = null;
      this.transport = null;
      await this.connect();
      log("Reconnected successfully", "mcp");
      return true;
    } catch (error: any) {
      log(`Reconnect failed: ${error.message}`, "mcp");
      return false;
    } finally {
      this.reconnecting = false;
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
      this.lastSuccessfulCall = Date.now();
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

    const mergedArgs = { ...args };
    if (this.tallyUrl && !mergedArgs.tally_url) {
      mergedArgs.tally_url = this.tallyUrl;
    }

    log(`Executing tool: ${toolName} with args: ${JSON.stringify(mergedArgs)}`, "mcp");

    try {
      const result = await this.client.callTool({ name: toolName, arguments: mergedArgs });
      log(`Tool ${toolName} executed successfully`, "mcp");
      this.lastSuccessfulCall = Date.now();
      return result;
    } catch (error: any) {
      log(`Tool ${toolName} execution failed: ${error.message}`, "mcp");

      const isStaleConnection =
        error.message.includes("-32602") ||
        error.message.includes("-32001") ||
        error.message.includes("timed out") ||
        error.message.includes("not connected") ||
        error.message.includes("connection");

      if (isStaleConnection) {
        log("Detected stale connection, attempting reconnect and retry...", "mcp");
        const reconnected = await this.reconnect();
        if (reconnected && this.client) {
          try {
            const retryResult = await this.client.callTool({ name: toolName, arguments: mergedArgs });
            log(`Tool ${toolName} succeeded after reconnect`, "mcp");
            this.lastSuccessfulCall = Date.now();
            return retryResult;
          } catch (retryError: any) {
            log(`Tool ${toolName} failed again after reconnect: ${retryError.message}`, "mcp");
            throw retryError;
          }
        }
      }

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
