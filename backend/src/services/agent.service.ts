import { EventEmitter } from 'events';
import Anthropic from '@anthropic-ai/sdk';
import { profileService } from './profile.service.js';
import { sessionService } from './session.service.js';
import { mcpService } from './mcp.service.js';
import { skillsService } from './skills.service.js';
import { jobsService } from './jobs.service.js';
import { traceService } from './trace.service.js';
import { contextService } from './context.service.js';
import { workspaceService } from './workspace.service.js';
import type { 
  AgentProfile, 
  ChatMessage, 
  StreamingMessage,
  Run 
} from '../types/index.js';

export interface AgentRunOptions {
  sessionId: string;
  prompt: string;
  jobId?: string;
  onMessage: (message: StreamingMessage) => void;
}

export class AgentService extends EventEmitter {
  private activeRuns: Map<string, { abortController: AbortController; runId: string }> = new Map();

  async runChat(options: AgentRunOptions): Promise<void> {
    const { sessionId, prompt, jobId, onMessage } = options;

    const session = await sessionService.getById(sessionId);
    const profile = await profileService.getById(session.agentProfileId);
    const workspace = await workspaceService.getById(session.workspaceId);

    await sessionService.addMessage(sessionId, 'user', prompt);

    let run: Run | undefined;
    if (jobId) {
      run = await jobsService.createRun(jobId, sessionId);
    }

    const abortController = new AbortController();
    if (run) {
      this.activeRuns.set(run.id, { abortController, runId: run.id });
    }

    try {
      await this.executeAgentQuery(
        profile,
        workspace.projectRoot,
        sessionId,
        prompt,
        run?.id,
        onMessage,
        abortController.signal
      );

      if (run) {
        await jobsService.completeRun(run.id, 'success');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      onMessage({ type: 'error', error: errorMessage });

      if (run) {
        await jobsService.completeRun(run.id, 'error', errorMessage);
        await traceService.createEvent(run.id, 'error', { error: errorMessage });
      }
    } finally {
      if (run) {
        this.activeRuns.delete(run.id);
      }
    }
  }

  private async executeAgentQuery(
    profile: AgentProfile,
    _projectRoot: string,
    sessionId: string,
    prompt: string,
    runId: string | undefined,
    onMessage: (message: StreamingMessage) => void,
    signal: AbortSignal
  ): Promise<void> {
    const history = await sessionService.getRecentHistory(sessionId, profile.maxTurnsInHistory);
    
    const skills = await skillsService.listByWorkspace(profile.workspaceId);
    const mcpTools = await mcpService.listToolsByWorkspace(profile.workspaceId);

    const conversationSlice = contextService.buildConversationSlice(history, profile.maxTurnsInHistory);
    const skillsSlice = contextService.buildSkillsSlice(skills);
    const mcpSlice = contextService.buildMcpSlice(mcpTools);

    if (runId) {
      await traceService.createContextSnapshot(runId, {
        historySummary: conversationSlice.summary,
        skillsSummary: skillsSlice.summary,
        mcpSummary: mcpSlice.summary,
      });

      await traceService.createEvent(runId, 'session_start', {
        sessionId,
        profile: profile.name,
        model: profile.model,
      });

      await traceService.createEvent(runId, 'user_prompt', {
        prompt,
        historyLength: history.length,
      });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    const hasValidApiKey = apiKey && apiKey !== 'your-api-key-here';

    if (hasValidApiKey) {
      await this.runWithAnthropicSdk(
        profile,
        sessionId,
        prompt,
        history,
        runId,
        onMessage,
        signal
      );
    } else {
      await this.runMockAgent(
        profile,
        prompt,
        history,
        runId,
        onMessage
      );
    }
  }

  private async runWithAnthropicSdk(
    profile: AgentProfile,
    sessionId: string,
    prompt: string,
    history: ChatMessage[],
    runId: string | undefined,
    onMessage: (message: StreamingMessage) => void,
    signal: AbortSignal
  ): Promise<void> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey || apiKey === 'your-api-key-here') {
      throw new Error('ANTHROPIC_API_KEY not configured. Please set your API key in Settings or in backend/.env');
    }

    const client = new Anthropic({ apiKey });

    // Build messages from history
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    for (const msg of history) {
      messages.push({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      });
    }
    // Add current prompt
    messages.push({ role: 'user', content: prompt });

    // Get MCP tools for enabled servers
    const mcpConfigs = await mcpService.listByWorkspace(profile.workspaceId);
    const mcpTools = await mcpService.listToolsByWorkspace(profile.workspaceId);
    
    // Filter to only enabled servers that are in profile's enabledMcpServers
    const enabledServerNames = profile.enabledMcpServers || [];
    const enabledMcpTools = mcpTools.filter(tool => {
      const serverConfig = mcpConfigs.find(c => c.name === tool.serverName);
      return serverConfig?.enabled && enabledServerNames.includes(tool.serverName);
    });

    // Convert MCP tools to Anthropic tool format
    const tools: Anthropic.Tool[] = enabledMcpTools.map(tool => ({
      name: tool.fullName,
      description: tool.description || `Tool ${tool.toolName} from ${tool.serverName}`,
      input_schema: (tool.inputSchema as Anthropic.Tool['input_schema']) || { type: 'object', properties: {} },
    }));

    // Build system prompt with MCP context
    let systemPrompt = profile.customSystemPromptAppend || 
      (profile.systemPromptPreset === 'claude_code' 
        ? 'You are Claude Code, an expert software engineer. Help the user with their coding tasks.'
        : 'You are a helpful AI assistant.');

    // Add MCP server info to system prompt if tools are available
    if (enabledMcpTools.length > 0) {
      const toolsByServer = enabledMcpTools.reduce((acc, tool) => {
        if (!acc[tool.serverName]) acc[tool.serverName] = [];
        acc[tool.serverName].push(tool.toolName);
        return acc;
      }, {} as Record<string, string[]>);
      
      const mcpInfo = Object.entries(toolsByServer)
        .map(([server, toolNames]) => `- ${server}: ${toolNames.join(', ')}`)
        .join('\n');
      
      systemPrompt += `\n\nYou have access to the following MCP servers and tools:\n${mcpInfo}\n\nUse these tools when appropriate to help the user.`;
    }

    if (runId) {
      await traceService.createEvent(runId, 'system_init', {
        model: profile.model,
        messagesCount: messages.length,
        enabledMcpServers: enabledServerNames,
        toolCount: tools.length,
      });
    }

    let fullResponse = '';
    let conversationMessages = [...messages];

    try {
      // Tool execution loop - max 10 iterations to prevent infinite loops
      for (let iteration = 0; iteration < 10; iteration++) {
        if (signal.aborted) break;

        const requestOptions: Anthropic.MessageCreateParams = {
          model: profile.model,
          max_tokens: 4096,
          system: systemPrompt,
          messages: conversationMessages,
        };

        if (tools.length > 0) {
          requestOptions.tools = tools;
        }

        // Use non-streaming for tool calls to properly handle tool_use blocks
        const response = await client.messages.create(requestOptions);

        // Process content blocks
        let hasToolUse = false;
        const toolUseBlocks: Array<{ id: string; name: string; input: Record<string, unknown> }> = [];

        for (const block of response.content) {
          if (block.type === 'text') {
            fullResponse += block.text;
            onMessage({ type: 'chunk', content: block.text });
          } else if (block.type === 'tool_use') {
            hasToolUse = true;
            toolUseBlocks.push({
              id: block.id,
              name: block.name,
              input: block.input as Record<string, unknown>,
            });
          }
        }

        // If no tool use, we're done
        if (!hasToolUse || response.stop_reason === 'end_turn') {
          break;
        }

        // Execute tools and collect results
        const toolResults: Array<{ type: 'tool_result'; tool_use_id: string; content: string }> = [];

        for (const toolUse of toolUseBlocks) {
          if (signal.aborted) break;

          // Parse server and tool name from fullName (mcp__ServerName__toolName)
          const parts = toolUse.name.split('__');
          if (parts.length >= 3 && parts[0] === 'mcp') {
            const serverName = parts[1];
            const toolName = parts.slice(2).join('__');

            onMessage({ type: 'tool_call', toolName: toolUse.name, content: JSON.stringify(toolUse.input) });

            if (runId) {
              await traceService.createEvent(runId, 'pre_tool_use', {
                toolName: toolUse.name,
                serverName,
                input: toolUse.input,
              });
            }

            // Execute the tool
            const result = await mcpService.executeTool(serverName, toolName, toolUse.input, profile.workspaceId);

            const resultContent = result.success 
              ? JSON.stringify(result.result, null, 2)
              : `Error: ${result.error}`;

            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: resultContent,
            });

            onMessage({ type: 'tool_result', toolName: toolUse.name, content: resultContent });

            if (runId) {
              await traceService.createEvent(runId, 'post_tool_use', {
                toolName: toolUse.name,
                success: result.success,
                result: result.success ? result.result : result.error,
              });
            }
          }
        }

        // Add assistant message with tool use to conversation
        conversationMessages.push({
          role: 'assistant',
          content: response.content as unknown as string,
        });

        // Add tool results to conversation
        conversationMessages.push({
          role: 'user',
          content: toolResults as unknown as string,
        });
      }

      // Save assistant message
      if (fullResponse) {
        await sessionService.addMessage(sessionId, 'assistant', fullResponse);
      }

      if (runId) {
        await traceService.createEvent(runId, 'stop', {
          responseLength: fullResponse.length,
        });
      }

      onMessage({ type: 'complete' });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('Anthropic API error:', errorMsg);
      throw error;
    }
  }

  private async runMockAgent(
    profile: AgentProfile,
    prompt: string,
    history: ChatMessage[],
    runId: string | undefined,
    onMessage: (message: StreamingMessage) => void
  ): Promise<void> {
    if (runId) {
      await traceService.createEvent(runId, 'system_init', {
        mock: true,
        model: profile.model,
        note: 'Claude Agent SDK not available, running mock response',
      });
    }

    const mockResponse = `⚠️ **API Key Not Configured**

Your message: "${prompt}"

**To get real Claude responses:**
1. Click the ⚙️ Settings icon in the sidebar
2. Select "API Key" connection mode
3. Enter your Anthropic API key
4. Click Save

The API key will now persist across server restarts.

---
*This is a mock response. Profile: ${profile.name} | Model: ${profile.model}*`;

    const words = mockResponse.split(' ');
    for (const word of words) {
      onMessage({ type: 'chunk', content: word + ' ' });
      await new Promise(resolve => setTimeout(resolve, 30));
    }

    if (history.length > 0) {
      await sessionService.addMessage(history[0].sessionId, 'assistant', mockResponse);
    }

    if (runId) {
      await traceService.createEvent(runId, 'stop', {
        mock: true,
        result: mockResponse,
      });
    }

    onMessage({ type: 'complete' });
  }

  cancelRun(runId: string): boolean {
    const activeRun = this.activeRuns.get(runId);
    if (activeRun) {
      activeRun.abortController.abort();
      return true;
    }
    return false;
  }

  getActiveRuns(): string[] {
    return Array.from(this.activeRuns.keys());
  }
}

export const agentService = new AgentService();
