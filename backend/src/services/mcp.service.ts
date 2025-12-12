import { v4 as uuidv4 } from 'uuid';
import prisma from '../utils/db.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';
import { parseJsonField, stringifyJsonField } from '../utils/json.js';
import type { MCPServerConfig, MCPTool, CreateMCPServerInput, MCPTransport } from '../types/index.js';

function mapDbToConfig(db: {
  id: string;
  workspaceId: string;
  name: string;
  transport: string;
  command: string | null;
  args: string;
  url: string | null;
  headers: string;
  env: string;
  enabled: boolean;
  lastStatus: string | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
}): MCPServerConfig {
  return {
    ...db,
    transport: db.transport as MCPTransport,
    args: parseJsonField<string[]>(db.args, []),
    headers: parseJsonField<Record<string, string>>(db.headers, {}),
    env: parseJsonField<Record<string, string>>(db.env, {}),
  };
}

function mapDbToTool(db: {
  id: string;
  workspaceId: string;
  serverName: string;
  toolName: string;
  fullName: string;
  description: string;
  inputSchema: string;
  isHighRisk: boolean;
  createdAt: Date;
  updatedAt: Date;
}): MCPTool {
  return {
    ...db,
    inputSchema: parseJsonField<Record<string, unknown>>(db.inputSchema, {}),
  };
}

const HIGH_RISK_PATTERNS = [
  'bash', 'shell', 'exec', 'command', 'run',
  'write', 'delete', 'remove', 'rm',
  'filesystem', 'file_write', 'file_delete',
  'query', 'sql', 'database',
  'http', 'fetch', 'request',
];

function isHighRiskTool(toolName: string, description: string): boolean {
  const text = `${toolName} ${description}`.toLowerCase();
  return HIGH_RISK_PATTERNS.some(pattern => text.includes(pattern));
}

export class MCPService {
  async listByWorkspace(workspaceId: string): Promise<MCPServerConfig[]> {
    const configs = await prisma.mCPServerConfig.findMany({
      where: { workspaceId },
      orderBy: { name: 'asc' },
    });
    return configs.map(mapDbToConfig);
  }

  async getById(id: string): Promise<MCPServerConfig> {
    const config = await prisma.mCPServerConfig.findUnique({
      where: { id },
    });
    if (!config) {
      throw new NotFoundError('MCPServerConfig', id);
    }
    return mapDbToConfig(config);
  }

  async getByName(workspaceId: string, name: string): Promise<MCPServerConfig> {
    const config = await prisma.mCPServerConfig.findUnique({
      where: { workspaceId_name: { workspaceId, name } },
    });
    if (!config) {
      throw new NotFoundError('MCPServerConfig', name);
    }
    return mapDbToConfig(config);
  }

  async create(input: CreateMCPServerInput): Promise<MCPServerConfig> {
    const existing = await prisma.mCPServerConfig.findUnique({
      where: { workspaceId_name: { workspaceId: input.workspaceId, name: input.name } },
    });
    if (existing) {
      throw new ConflictError(`MCP server "${input.name}" already exists in this workspace`);
    }

    const config = await prisma.mCPServerConfig.create({
      data: {
        id: uuidv4(),
        workspaceId: input.workspaceId,
        name: input.name,
        transport: input.transport,
        command: input.command ?? null,
        args: stringifyJsonField(input.args ?? []),
        url: input.url ?? null,
        headers: stringifyJsonField(input.headers ?? {}),
        env: stringifyJsonField(input.env ?? {}),
        enabled: input.enabled ?? true,
      },
    });
    return mapDbToConfig(config);
  }

  async update(id: string, input: Partial<CreateMCPServerInput>): Promise<MCPServerConfig> {
    await this.getById(id);

    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.transport !== undefined) data.transport = input.transport;
    if (input.command !== undefined) data.command = input.command;
    if (input.args !== undefined) data.args = stringifyJsonField(input.args);
    if (input.url !== undefined) data.url = input.url;
    if (input.headers !== undefined) data.headers = stringifyJsonField(input.headers);
    if (input.env !== undefined) data.env = stringifyJsonField(input.env);
    if (input.enabled !== undefined) data.enabled = input.enabled;

    const config = await prisma.mCPServerConfig.update({
      where: { id },
      data,
    });
    return mapDbToConfig(config);
  }

  async delete(id: string): Promise<void> {
    await this.getById(id);
    await prisma.mCPServerConfig.delete({
      where: { id },
    });
  }

  async updateStatus(id: string, status: string, error?: string): Promise<void> {
    await prisma.mCPServerConfig.update({
      where: { id },
      data: {
        lastStatus: status,
        lastError: error ?? null,
      },
    });
  }

  async listToolsByWorkspace(workspaceId: string): Promise<MCPTool[]> {
    const tools = await prisma.mCPTool.findMany({
      where: { workspaceId },
      orderBy: [{ serverName: 'asc' }, { toolName: 'asc' }],
    });
    return tools.map(mapDbToTool);
  }

  async listToolsByServer(workspaceId: string, serverName: string): Promise<MCPTool[]> {
    const tools = await prisma.mCPTool.findMany({
      where: { workspaceId, serverName },
      orderBy: { toolName: 'asc' },
    });
    return tools.map(mapDbToTool);
  }

  async syncTools(
    workspaceId: string,
    serverName: string,
    tools: { name: string; description?: string; inputSchema?: Record<string, unknown> }[]
  ): Promise<MCPTool[]> {
    await prisma.mCPTool.deleteMany({
      where: { workspaceId, serverName },
    });

    const createdTools: MCPTool[] = [];
    for (const tool of tools) {
      const fullName = `mcp__${serverName}__${tool.name}`;
      const description = tool.description ?? '';
      
      const created = await prisma.mCPTool.create({
        data: {
          id: uuidv4(),
          workspaceId,
          serverName,
          toolName: tool.name,
          fullName,
          description,
          inputSchema: stringifyJsonField(tool.inputSchema ?? {}),
          isHighRisk: isHighRiskTool(tool.name, description),
        },
      });
      createdTools.push(mapDbToTool(created));
    }

    return createdTools;
  }

  buildMcpServersConfig(
    configs: MCPServerConfig[],
    enabledServers: string[]
  ): Record<string, { command?: string; args?: string[]; url?: string; headers?: Record<string, string>; env?: Record<string, string> }> {
    const result: Record<string, { command?: string; args?: string[]; url?: string; headers?: Record<string, string>; env?: Record<string, string> }> = {};

    for (const config of configs) {
      if (!config.enabled || !enabledServers.includes(config.name)) {
        continue;
      }

      if (config.transport === 'stdio' && config.command) {
        result[config.name] = {
          command: config.command,
          args: config.args,
          env: config.env,
        };
      } else if ((config.transport === 'http' || config.transport === 'sse') && config.url) {
        result[config.name] = {
          url: config.url,
          headers: config.headers,
        };
      }
    }

    return result;
  }
}

export const mcpService = new MCPService();
