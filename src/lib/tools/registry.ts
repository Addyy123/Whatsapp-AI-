import { ToolSchema } from '../llm/types';

export type ToolHandler = (args: any, context: ToolContext) => Promise<any>;

export interface ToolContext {
  agent_id: string;
  user_id: string;
}

export interface RegisteredTool {
  name: string;
  schema: ToolSchema;
  handler: ToolHandler;
}

export class ToolRegistry {
  private tools = new Map<string, RegisteredTool>();

  register(tool: RegisteredTool) {
    this.tools.set(tool.name, tool);
  }

  getTool(name: string): RegisteredTool | undefined {
    return this.tools.get(name);
  }

  getAllSchemas(enabledToolNames: string[]): ToolSchema[] {
    const schemas: ToolSchema[] = [];
    for (const name of enabledToolNames) {
      const tool = this.tools.get(name);
      if (tool) schemas.push(tool.schema);
    }
    return schemas;
  }
}

// Global registry instance
export const toolRegistry = new ToolRegistry();
