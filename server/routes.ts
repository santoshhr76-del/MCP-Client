import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { mcpClient } from "./mcp-client";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/mcp/status", async (_req, res) => {
    try {
      const status = mcpClient.getStatus();
      res.json(status);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/mcp/config", async (_req, res) => {
    try {
      const config = mcpClient.getConfig();
      res.json(config);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/mcp/config", async (req, res) => {
    try {
      const { serverUrl, authToken } = req.body;

      if (serverUrl && typeof serverUrl === "string") {
        try {
          new URL(serverUrl);
        } catch {
          return res.status(400).json({ message: "Invalid server URL format" });
        }
        mcpClient.setServerUrl(serverUrl);
      }
      if (authToken !== undefined) {
        mcpClient.setAuthToken(authToken || null);
      }

      if (mcpClient.isConnected()) {
        await mcpClient.disconnect();
      }

      const config = mcpClient.getConfig();
      res.json(config);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/mcp/connect", async (req, res) => {
    try {
      const { serverUrl, authToken } = req.body || {};
      const status = await mcpClient.connect(serverUrl, authToken);
      res.json(status);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/mcp/disconnect", async (_req, res) => {
    try {
      await mcpClient.disconnect();
      res.json({ connected: false });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/mcp/tools", async (_req, res) => {
    try {
      if (!mcpClient.isConnected()) {
        return res.status(400).json({ message: "Not connected to MCP server" });
      }
      const tools = mcpClient.getTools();
      res.json(tools);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/mcp/tools/refresh", async (_req, res) => {
    try {
      if (!mcpClient.isConnected()) {
        return res.status(400).json({ message: "Not connected to MCP server" });
      }
      const tools = await mcpClient.refreshTools();
      res.json(tools);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/mcp/execute", async (req, res) => {
    try {
      if (!mcpClient.isConnected()) {
        return res.status(400).json({ message: "Not connected to MCP server" });
      }

      const { toolName, arguments: args } = req.body;

      if (!toolName || typeof toolName !== "string") {
        return res.status(400).json({ message: "toolName is required" });
      }

      try {
        const result = await mcpClient.executeTool(toolName, args || {});

        const execution = await storage.createToolExecution({
          toolName,
          arguments: args || {},
          result,
          status: "success",
          error: null,
        });

        res.json({ status: "success", result, executionId: execution.id });
      } catch (execError: any) {
        const execution = await storage.createToolExecution({
          toolName,
          arguments: args || {},
          result: null,
          status: "error",
          error: execError.message,
        });

        res.json({
          status: "error",
          error: execError.message,
          executionId: execution.id,
        });
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/mcp/history", async (_req, res) => {
    try {
      const executions = await storage.getToolExecutions();
      res.json(executions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/mcp/history/:id", async (req, res) => {
    try {
      const execution = await storage.getToolExecution(req.params.id);
      if (!execution) {
        return res.status(404).json({ message: "Execution not found" });
      }
      res.json(execution);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  return httpServer;
}
