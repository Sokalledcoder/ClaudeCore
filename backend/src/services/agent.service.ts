import { EventEmitter } from 'events';
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
  TraceEventType,
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
    projectRoot: string,
    sessionId: string,
    prompt: string,
    runId: string | undefined,
    onMessage: (message: StreamingMessage) => void,
    signal: AbortSignal
  ): Promise<void> {
    const history = await sessionService.getRecentHistory(sessionId, profile.maxTurnsInHistory);
    
    const skills = await skillsService.listByWorkspace(profile.workspaceId);
    const mcpConfigs = await mcpService.listByWorkspace(profile.workspaceId);
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

    const mcpServersConfig = mcpService.buildMcpServersConfig(mcpConfigs, profile.enabledMcpServers);

    const hasClaudeAgentSdk = await this.checkClaudeAgentSdk();

    if (hasClaudeAgentSdk) {
      await this.runWithClaudeAgentSdk(
        profile,
        projectRoot,
        prompt,
        history,
        mcpServersConfig,
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

  private async checkClaudeAgentSdk(): Promise<boolean> {
    try {
      await import('@anthropic-ai/claude-agent-sdk');
      return true;
    } catch {
      return false;
    }
  }

  private async runWithClaudeAgentSdk(
    profile: AgentProfile,
    projectRoot: string,
    prompt: string,
    history: ChatMessage[],
    mcpServersConfig: Record<string, unknown>,
    runId: string | undefined,
    onMessage: (message: StreamingMessage) => void,
    signal: AbortSignal
  ): Promise<void> {
    const { query } = await import('@anthropic-ai/claude-agent-sdk');

    const systemPromptConfig = profile.systemPromptPreset === 'claude_code'
      ? { type: 'preset' as const, preset: 'claude_code' as const, append: profile.customSystemPromptAppend ?? undefined }
      : profile.customSystemPromptAppend ?? 'You are a helpful AI assistant.';

    const hooks = this.buildHooks(runId, onMessage);

    const response = query({
      prompt,
      options: {
        model: profile.model,
        cwd: projectRoot,
        systemPrompt: systemPromptConfig,
        allowedTools: profile.allowedTools.length > 0 ? profile.allowedTools : undefined,
        mcpServers: mcpServersConfig as Record<string, { command?: string; args?: string[] }>,
        settingSources: profile.enabledSkillScopes as ('user' | 'project')[],
        hooks,
        abortController: { signal } as AbortController,
        maxTurns: 50,
      },
    });

    let fullResponse = '';

    for await (const message of response) {
      if (signal.aborted) break;

      if (message.type === 'assistant') {
        const content = typeof message.message?.content === 'string' 
          ? message.message.content 
          : JSON.stringify(message.message?.content);
        
        fullResponse += content;
        onMessage({ type: 'chunk', content });
      } else if (message.type === 'stream_event') {
        if (message.event?.type === 'content_block_delta') {
          const delta = (message.event as { delta?: { text?: string } }).delta;
          if (delta?.text) {
            fullResponse += delta.text;
            onMessage({ type: 'chunk', content: delta.text });
          }
        }
      } else if (message.type === 'system' && message.subtype === 'init') {
        if (runId) {
          await traceService.createEvent(runId, 'system_init', {
            sessionId: message.session_id,
            model: message.model,
            tools: message.tools,
            mcpServers: message.mcp_servers,
          });
        }
      } else if (message.type === 'result') {
        if (runId) {
          await traceService.createEvent(runId, 'stop', {
            subtype: message.subtype,
            result: message.result,
            usage: message.usage,
            totalCost: message.total_cost_usd,
          });
        }
      }
    }

    if (fullResponse) {
      await sessionService.addMessage(
        history[0]?.sessionId ?? '',
        'assistant',
        fullResponse
      );
    }

    onMessage({ type: 'complete' });
  }

  private buildHooks(
    runId: string | undefined,
    onMessage: (message: StreamingMessage) => void
  ): Record<string, { matcher?: string; hooks: ((input: unknown) => Promise<{ continue?: boolean }>)[] }[]> {
    const createHook = (type: TraceEventType) => async (input: unknown) => {
      if (runId) {
        const event = await traceService.createEvent(runId, type, input as Record<string, unknown>);
        onMessage({ type: 'trace_event', traceEvent: event });
      }
      return { continue: true };
    };

    return {
      PreToolUse: [{ hooks: [createHook('pre_tool_use')] }],
      PostToolUse: [{ hooks: [createHook('post_tool_use')] }],
      SubagentStart: [{ hooks: [createHook('subagent_start')] }],
      SubagentStop: [{ hooks: [createHook('subagent_stop')] }],
      Notification: [{ hooks: [createHook('notification')] }],
    };
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

    const mockResponse = `I received your message: "${prompt}"

This is a mock response because the Claude Agent SDK is not installed or configured.

To enable full functionality:
1. Install the Claude Agent SDK: npm install @anthropic-ai/claude-agent-sdk
2. Set your ANTHROPIC_API_KEY environment variable

Profile: ${profile.name}
Model: ${profile.model}
History messages: ${history.length}
Allowed tools: ${profile.allowedTools.length > 0 ? profile.allowedTools.join(', ') : 'all'}
Enabled MCP servers: ${profile.enabledMcpServers.length > 0 ? profile.enabledMcpServers.join(', ') : 'none'}`;

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
