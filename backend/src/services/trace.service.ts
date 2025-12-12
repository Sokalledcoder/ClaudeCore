import { v4 as uuidv4 } from 'uuid';
import prisma from '../utils/db.js';
import { parseJsonField, stringifyJsonField } from '../utils/json.js';
import type { TraceEvent, TraceEventType, ContextSnapshot } from '../types/index.js';

function mapDbToTraceEvent(db: {
  id: string;
  runId: string;
  type: string;
  timestamp: Date;
  payload: string;
}): TraceEvent {
  return {
    ...db,
    type: db.type as TraceEventType,
    payload: parseJsonField<Record<string, unknown>>(db.payload, {}),
  };
}

export class TraceService {
  async createEvent(
    runId: string,
    type: TraceEventType,
    payload: Record<string, unknown>
  ): Promise<TraceEvent> {
    const event = await prisma.traceEvent.create({
      data: {
        id: uuidv4(),
        runId,
        type,
        payload: stringifyJsonField(payload),
      },
    });
    return mapDbToTraceEvent(event);
  }

  async listByRun(runId: string): Promise<TraceEvent[]> {
    const events = await prisma.traceEvent.findMany({
      where: { runId },
      orderBy: { timestamp: 'asc' },
    });
    return events.map(mapDbToTraceEvent);
  }

  async createContextSnapshot(
    runId: string,
    data: {
      historySummary?: string;
      docsSummary?: string;
      skillsSummary?: string;
      mcpSummary?: string;
      scratchpadSummary?: string;
    }
  ): Promise<ContextSnapshot> {
    const snapshot = await prisma.contextSnapshot.create({
      data: {
        id: uuidv4(),
        runId,
        historySummary: data.historySummary ?? '',
        docsSummary: data.docsSummary ?? '',
        skillsSummary: data.skillsSummary ?? '',
        mcpSummary: data.mcpSummary ?? '',
        scratchpadSummary: data.scratchpadSummary ?? '',
      },
    });
    return snapshot;
  }

  async getLatestSnapshot(runId: string): Promise<ContextSnapshot | null> {
    const snapshot = await prisma.contextSnapshot.findFirst({
      where: { runId },
      orderBy: { createdAt: 'desc' },
    });
    return snapshot;
  }

  async listSnapshotsByRun(runId: string): Promise<ContextSnapshot[]> {
    const snapshots = await prisma.contextSnapshot.findMany({
      where: { runId },
      orderBy: { createdAt: 'asc' },
    });
    return snapshots;
  }

  buildHookEventPayload(
    hookType: string,
    input: Record<string, unknown>
  ): { type: TraceEventType; payload: Record<string, unknown> } {
    const typeMap: Record<string, TraceEventType> = {
      SessionStart: 'session_start',
      UserPromptSubmit: 'user_prompt',
      PreToolUse: 'pre_tool_use',
      PostToolUse: 'post_tool_use',
      SubagentStart: 'subagent_start',
      SubagentStop: 'subagent_stop',
      Stop: 'stop',
      Notification: 'notification',
    };

    return {
      type: typeMap[hookType] ?? 'notification',
      payload: {
        hookType,
        ...input,
      },
    };
  }
}

export const traceService = new TraceService();
