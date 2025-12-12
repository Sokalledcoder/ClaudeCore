import { v4 as uuidv4 } from 'uuid';
import { spawn, ChildProcess } from 'child_process';
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

  async testConnection(config: MCPServerConfig): Promise<{ success: boolean; error?: string }> {
    if (config.transport === 'stdio' && config.command) {
      return this.testStdioConnection(config);
    } else if ((config.transport === 'http' || config.transport === 'sse') && config.url) {
      return this.testHttpConnection(config);
    }
    return { success: false, error: 'Invalid server configuration' };
  }

  private async testStdioConnection(config: MCPServerConfig): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        if (proc && !proc.killed) {
          proc.kill();
        }
        resolve({ success: false, error: 'Connection timeout (5s)' });
      }, 5000);

      let proc: ChildProcess | null = null;
      try {
        proc = spawn(config.command!, config.args, {
          env: { ...process.env, ...config.env },
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        let output = '';
        let errorOutput = '';

        proc.stdout?.on('data', (data) => {
          output += data.toString();
          // If we receive any valid JSON-RPC response, connection works
          if (output.includes('"jsonrpc"') || output.includes('{"')) {
            clearTimeout(timeout);
            proc?.kill();
            resolve({ success: true });
          }
        });

        proc.stderr?.on('data', (data) => {
          errorOutput += data.toString();
        });

        proc.on('error', (err) => {
          clearTimeout(timeout);
          resolve({ success: false, error: `Failed to spawn process: ${err.message}` });
        });

        proc.on('close', (code) => {
          clearTimeout(timeout);
          if (code === 0 || output.includes('"jsonrpc"')) {
            resolve({ success: true });
          } else {
            resolve({ success: false, error: errorOutput || `Process exited with code ${code}` });
          }
        });

        // Send initialize request
        const initRequest = JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'agent-control-room', version: '1.0.0' }
          }
        }) + '\n';
        
        proc.stdin?.write(initRequest);
      } catch (err) {
        clearTimeout(timeout);
        resolve({ success: false, error: err instanceof Error ? err.message : 'Unknown error' });
      }
    });
  }

  private async testHttpConnection(config: MCPServerConfig): Promise<{ success: boolean; error?: string }> {
    try {
      // First try GET to check if server info is available (streamable-http servers)
      const infoResponse = await fetch(config.url!, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          ...config.headers,
        },
        signal: AbortSignal.timeout(5000),
      });

      if (infoResponse.ok) {
        const info = await infoResponse.json() as { name?: string; transport?: string };
        if (info.name || info.transport) {
          return { success: true };
        }
      }

      // If GET didn't work, try POST with initialize (standard MCP)
      const response = await fetch(config.url!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
          ...config.headers,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2025-06-18',
            capabilities: {},
            clientInfo: { name: 'agent-control-room', version: '1.0.0' }
          }
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        return { success: true };
      }
      return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Connection failed' };
    }
  }

  async discoverTools(config: MCPServerConfig): Promise<{ name: string; description?: string; inputSchema?: Record<string, unknown> }[]> {
    if (config.transport === 'stdio' && config.command) {
      return this.discoverStdioTools(config);
    } else if ((config.transport === 'http' || config.transport === 'sse') && config.url) {
      return this.discoverHttpTools(config);
    }
    return [];
  }

  private async discoverStdioTools(config: MCPServerConfig): Promise<{ name: string; description?: string; inputSchema?: Record<string, unknown> }[]> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        if (proc && !proc.killed) {
          proc.kill();
        }
        resolve([]);
      }, 10000);

      let proc: ChildProcess | null = null;
      try {
        proc = spawn(config.command!, config.args, {
          env: { ...process.env, ...config.env },
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        let buffer = '';
        let messageId = 1;

        proc.stdout?.on('data', (data) => {
          buffer += data.toString();
          
          // Try to parse complete JSON messages
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const msg = JSON.parse(line);
              
              if (msg.id === 1 && msg.result) {
                // Initialize response received, now request tools
                messageId++;
                const toolsRequest = JSON.stringify({
                  jsonrpc: '2.0',
                  id: messageId,
                  method: 'tools/list',
                  params: {}
                }) + '\n';
                proc?.stdin?.write(toolsRequest);
              } else if (msg.id === 2 && msg.result?.tools) {
                // Tools list received
                clearTimeout(timeout);
                proc?.kill();
                resolve(msg.result.tools.map((t: { name: string; description?: string; inputSchema?: Record<string, unknown> }) => ({
                  name: t.name,
                  description: t.description,
                  inputSchema: t.inputSchema,
                })));
              }
            } catch {
              // Not valid JSON, continue
            }
          }
        });

        proc.on('error', () => {
          clearTimeout(timeout);
          resolve([]);
        });

        proc.on('close', () => {
          clearTimeout(timeout);
          resolve([]);
        });

        // Send initialize request
        const initRequest = JSON.stringify({
          jsonrpc: '2.0',
          id: messageId,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'agent-control-room', version: '1.0.0' }
          }
        }) + '\n';
        
        proc.stdin?.write(initRequest);
      } catch {
        clearTimeout(timeout);
        resolve([]);
      }
    });
  }

  private async discoverHttpTools(config: MCPServerConfig): Promise<{ name: string; description?: string; inputSchema?: Record<string, unknown> }[]> {
    try {
      // First, initialize session for stateful servers
      const initResponse = await fetch(config.url!, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
          ...config.headers 
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2025-06-18',
            capabilities: {},
            clientInfo: { name: 'agent-control-room', version: '1.0.0' }
          }
        }),
        signal: AbortSignal.timeout(10000),
      });

      // Extract session ID from response if present
      let sessionId: string | null = null;
      if (initResponse.ok) {
        const sessionHeader = initResponse.headers.get('mcp-session-id');
        if (sessionHeader) {
          sessionId = sessionHeader;
        }
      }

      // Now list tools with session ID if we have one
      const toolsHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        ...config.headers
      };
      if (sessionId) {
        toolsHeaders['mcp-session-id'] = sessionId;
      }

      const response = await fetch(config.url!, {
        method: 'POST',
        headers: toolsHeaders,
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/list',
          params: {}
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type') || '';
        
        if (contentType.includes('text/event-stream')) {
          // Handle SSE response
          const text = await response.text();
          const lines = text.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.result?.tools) {
                  return data.result.tools;
                }
              } catch {
                // Continue parsing
              }
            }
          }
        } else {
          // Handle JSON response
          const data = await response.json() as { result?: { tools?: { name: string; description?: string; inputSchema?: Record<string, unknown> }[] } };
          if (data.result?.tools) {
            return data.result.tools;
          }
        }
      }
      return [];
    } catch (err) {
      console.error('Error discovering HTTP tools:', err);
      return [];
    }
  }

  async executeTool(
    serverName: string, 
    toolName: string, 
    args: Record<string, unknown>,
    workspaceId: string
  ): Promise<{ success: boolean; result?: unknown; error?: string }> {
    try {
      const configs = await this.listByWorkspace(workspaceId);
      const config = configs.find(c => c.name === serverName);
      
      if (!config) {
        return { success: false, error: `MCP server "${serverName}" not found` };
      }

      if (config.transport === 'http' || config.transport === 'sse') {
        return this.executeHttpTool(config, toolName, args);
      } else if (config.transport === 'stdio') {
        return this.executeStdioTool(config, toolName, args);
      }

      return { success: false, error: `Unsupported transport: ${config.transport}` };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  private async executeHttpTool(
    config: MCPServerConfig,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<{ success: boolean; result?: unknown; error?: string }> {
    try {
      // Initialize session first
      const initResponse = await fetch(config.url!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
          ...config.headers,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2025-06-18',
            capabilities: {},
            clientInfo: { name: 'agent-control-room', version: '1.0.0' }
          }
        }),
        signal: AbortSignal.timeout(30000),
      });

      let sessionId: string | null = null;
      if (initResponse.ok) {
        sessionId = initResponse.headers.get('mcp-session-id');
      }

      // Execute the tool
      const toolHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        ...config.headers,
      };
      if (sessionId) {
        toolHeaders['mcp-session-id'] = sessionId;
      }

      const response = await fetch(config.url!, {
        method: 'POST',
        headers: toolHeaders,
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: {
            name: toolName,
            arguments: args
          }
        }),
        signal: AbortSignal.timeout(60000),
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type') || '';
        
        if (contentType.includes('text/event-stream')) {
          const text = await response.text();
          const lines = text.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.result) {
                  return { success: true, result: data.result };
                }
                if (data.error) {
                  return { success: false, error: data.error.message || 'Tool execution failed' };
                }
              } catch {
                // Continue parsing
              }
            }
          }
        } else {
          const data = await response.json() as { result?: unknown; error?: { message?: string } };
          if (data.result) {
            return { success: true, result: data.result };
          }
          if (data.error) {
            return { success: false, error: data.error.message || 'Tool execution failed' };
          }
        }
      }
      
      return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Tool execution failed' };
    }
  }

  private async executeStdioTool(
    config: MCPServerConfig,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<{ success: boolean; result?: unknown; error?: string }> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        if (proc && !proc.killed) proc.kill();
        resolve({ success: false, error: 'Tool execution timed out' });
      }, 30000);

      let proc: ChildProcess | null = null;
      try {
        proc = spawn(config.command!, config.args, {
          env: { ...process.env, ...config.env },
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        let buffer = '';

        proc.stdout?.on('data', (data) => {
          buffer += data.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const msg = JSON.parse(line);
              if (msg.id === 1 && msg.result) {
                // Initialize done, send tool call
                const toolRequest = JSON.stringify({
                  jsonrpc: '2.0',
                  id: 2,
                  method: 'tools/call',
                  params: { name: toolName, arguments: args }
                }) + '\n';
                proc?.stdin?.write(toolRequest);
              } else if (msg.id === 2) {
                clearTimeout(timeout);
                proc?.kill();
                if (msg.result) {
                  resolve({ success: true, result: msg.result });
                } else if (msg.error) {
                  resolve({ success: false, error: msg.error.message || 'Tool failed' });
                }
              }
            } catch {
              // Continue
            }
          }
        });

        proc.on('error', (err) => {
          clearTimeout(timeout);
          resolve({ success: false, error: err.message });
        });

        // Send initialize
        const initRequest = JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2025-06-18',
            capabilities: {},
            clientInfo: { name: 'agent-control-room', version: '1.0.0' }
          }
        }) + '\n';
        proc.stdin?.write(initRequest);
      } catch (err) {
        clearTimeout(timeout);
        resolve({ success: false, error: err instanceof Error ? err.message : 'Failed to start process' });
      }
    });
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
