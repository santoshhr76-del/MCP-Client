import { type User, type InsertUser, type ToolExecution, type InsertToolExecution } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createToolExecution(execution: InsertToolExecution): Promise<ToolExecution>;
  getToolExecutions(): Promise<ToolExecution[]>;
  getToolExecution(id: string): Promise<ToolExecution | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private toolExecutions: Map<string, ToolExecution>;

  constructor() {
    this.users = new Map();
    this.toolExecutions = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createToolExecution(execution: InsertToolExecution): Promise<ToolExecution> {
    const id = randomUUID();
    const toolExecution: ToolExecution = {
      id,
      toolName: execution.toolName,
      arguments: execution.arguments ?? null,
      result: execution.result ?? null,
      status: execution.status ?? "pending",
      error: execution.error ?? null,
      executedAt: new Date(),
    };
    this.toolExecutions.set(id, toolExecution);
    return toolExecution;
  }

  async getToolExecutions(): Promise<ToolExecution[]> {
    return Array.from(this.toolExecutions.values()).sort(
      (a, b) => {
        const aTime = a.executedAt ? new Date(a.executedAt).getTime() : 0;
        const bTime = b.executedAt ? new Date(b.executedAt).getTime() : 0;
        return bTime - aTime;
      }
    );
  }

  async getToolExecution(id: string): Promise<ToolExecution | undefined> {
    return this.toolExecutions.get(id);
  }
}

export const storage = new MemStorage();
