import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const toolExecutions = pgTable("tool_executions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  toolName: text("tool_name").notNull(),
  arguments: jsonb("arguments"),
  result: jsonb("result"),
  status: text("status").notNull().default("pending"),
  error: text("error"),
  executedAt: timestamp("executed_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertToolExecutionSchema = createInsertSchema(toolExecutions).pick({
  toolName: true,
  arguments: true,
  result: true,
  status: true,
  error: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertToolExecution = z.infer<typeof insertToolExecutionSchema>;
export type ToolExecution = typeof toolExecutions.$inferSelect;

export const mcpToolSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  inputSchema: z.any().optional(),
});

export type McpTool = z.infer<typeof mcpToolSchema>;

export const mcpConnectionStatusSchema = z.object({
  connected: z.boolean(),
  serverUrl: z.string(),
  serverName: z.string().optional(),
  serverVersion: z.string().optional(),
  toolCount: z.number().optional(),
});

export type McpConnectionStatus = z.infer<typeof mcpConnectionStatusSchema>;
