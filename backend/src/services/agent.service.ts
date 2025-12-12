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

    // Get system prompt from profile
    const systemPrompt = profile.customSystemPromptAppend || 
      (profile.systemPromptPreset === 'claude_code' 
        ? 'You are Claude Code, an expert software engineer. Help the user with their coding tasks.'
        : 'You are a helpful AI assistant.');

    if (runId) {
      await traceService.createEvent(runId, 'system_init', {
        model: profile.model,
        messagesCount: messages.length,
      });
    }

    let fullResponse = '';

    try {
      const stream = await client.messages.stream({
        model: profile.model,
        max_tokens: 4096,
        system: systemPrompt,
        messages,
      });

      for await (const event of stream) {
        if (signal.aborted) break;

        if (event.type === 'content_block_delta') {
          const delta = event.delta as { type: string; text?: string };
          if (delta.type === 'text_delta' && delta.text) {
            fullResponse += delta.text;
            onMessage({ type: 'chunk', content: delta.text });
          }
        }
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
