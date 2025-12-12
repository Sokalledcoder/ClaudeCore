import type { ChatMessage, ContextSlice, ContextSliceItem, SkillMetadata, MCPTool } from '../types/index.js';

export class ContextService {
  buildConversationSlice(
    messages: ChatMessage[],
    maxTurns: number
  ): ContextSlice {
    const recentMessages = messages.slice(-maxTurns * 2);
    const items: ContextSliceItem[] = recentMessages.map((m, i) => ({
      id: m.id,
      title: `${m.role} message ${i + 1}`,
      content: m.content,
      source: 'conversation',
      pinned: false,
    }));

    const totalChars = items.reduce((sum, item) => sum + item.content.length, 0);
    const tokenEstimate = Math.ceil(totalChars / 4);

    return {
      type: 'conversation',
      summary: `${recentMessages.length} messages from conversation history`,
      tokenEstimate,
      items,
      pinned: false,
    };
  }

  buildSkillsSlice(skills: SkillMetadata[]): ContextSlice {
    const items: ContextSliceItem[] = skills.map(s => ({
      id: s.id,
      title: s.name,
      content: s.description,
      source: `skill:${s.slug}`,
      pinned: false,
    }));

    return {
      type: 'skills',
      summary: `${skills.length} skills available`,
      tokenEstimate: skills.length * 50,
      items,
      pinned: false,
    };
  }

  buildMcpSlice(tools: MCPTool[]): ContextSlice {
    const items: ContextSliceItem[] = tools.map(t => ({
      id: t.id,
      title: t.fullName,
      content: t.description,
      source: `mcp:${t.serverName}`,
      pinned: false,
    }));

    return {
      type: 'mcp_outputs',
      summary: `${tools.length} MCP tools available`,
      tokenEstimate: tools.length * 30,
      items,
      pinned: false,
    };
  }

  buildTaskSpecSlice(title: string, description: string): ContextSlice {
    return {
      type: 'task_spec',
      summary: title,
      tokenEstimate: Math.ceil((title.length + description.length) / 4),
      items: [
        {
          id: 'task-spec',
          title,
          content: description,
          source: 'job',
          pinned: true,
        },
      ],
      pinned: true,
    };
  }

  buildScratchpadSlice(content: string): ContextSlice {
    return {
      type: 'scratchpad',
      summary: 'Working notes and summaries',
      tokenEstimate: Math.ceil(content.length / 4),
      items: [
        {
          id: 'scratchpad',
          title: 'Scratchpad',
          content,
          source: 'scratchpad',
          pinned: true,
        },
      ],
      pinned: true,
    };
  }

  buildRetrievedDocsSlice(docs: { id: string; title: string; content: string; source: string }[]): ContextSlice {
    const items: ContextSliceItem[] = docs.map(d => ({
      ...d,
      pinned: false,
    }));

    const totalChars = items.reduce((sum, item) => sum + item.content.length, 0);

    return {
      type: 'retrieved_docs',
      summary: `${docs.length} retrieved documents`,
      tokenEstimate: Math.ceil(totalChars / 4),
      items,
      pinned: false,
    };
  }

  estimateTotalTokens(slices: ContextSlice[]): number {
    return slices.reduce((sum, slice) => sum + slice.tokenEstimate, 0);
  }

  summarizeSlices(slices: ContextSlice[]): string {
    return slices
      .map(s => `[${s.type}] ${s.summary} (~${s.tokenEstimate} tokens)`)
      .join('\n');
  }

  buildPromptFromSlices(slices: ContextSlice[], userMessage: string): string {
    const parts: string[] = [];

    const taskSpec = slices.find(s => s.type === 'task_spec');
    if (taskSpec?.items[0]) {
      parts.push(`## Task\n${taskSpec.items[0].content}`);
    }

    const scratchpad = slices.find(s => s.type === 'scratchpad');
    if (scratchpad?.items[0]?.content) {
      parts.push(`## Working Notes\n${scratchpad.items[0].content}`);
    }

    const docs = slices.find(s => s.type === 'retrieved_docs');
    if (docs && docs.items.length > 0) {
      const docsContent = docs.items
        .map(d => `### ${d.title}\n${d.content}`)
        .join('\n\n');
      parts.push(`## Retrieved Documents\n${docsContent}`);
    }

    parts.push(`## User Request\n${userMessage}`);

    return parts.join('\n\n');
  }
}

export const contextService = new ContextService();
