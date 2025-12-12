import { v4 as uuidv4 } from 'uuid';
import prisma from '../utils/db.js';
import { NotFoundError } from '../utils/errors.js';
import type { ChatSession, ChatMessage, CreateChatSessionInput, MessageRole } from '../types/index.js';

export class SessionService {
  async listByWorkspace(workspaceId: string): Promise<ChatSession[]> {
    const sessions = await prisma.chatSession.findMany({
      where: { workspaceId, archived: false },
      orderBy: { updatedAt: 'desc' },
    });
    return sessions;
  }

  async getById(id: string): Promise<ChatSession> {
    const session = await prisma.chatSession.findUnique({
      where: { id },
    });
    if (!session) {
      throw new NotFoundError('ChatSession', id);
    }
    return session;
  }

  async create(input: CreateChatSessionInput): Promise<ChatSession> {
    const session = await prisma.chatSession.create({
      data: {
        id: uuidv4(),
        workspaceId: input.workspaceId,
        agentProfileId: input.agentProfileId,
        title: input.title ?? 'New Chat',
      },
    });
    return session;
  }

  async update(id: string, data: { title?: string; archived?: boolean }): Promise<ChatSession> {
    await this.getById(id);
    const session = await prisma.chatSession.update({
      where: { id },
      data,
    });
    return session;
  }

  async delete(id: string): Promise<void> {
    await this.getById(id);
    await prisma.chatSession.delete({
      where: { id },
    });
  }

  async getMessages(sessionId: string, limit = 100): Promise<ChatMessage[]> {
    const messages = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
    return messages.map(m => ({
      ...m,
      role: m.role as MessageRole,
    }));
  }

  async addMessage(
    sessionId: string,
    role: MessageRole,
    content: string,
    jobId?: string,
    runId?: string
  ): Promise<ChatMessage> {
    const message = await prisma.chatMessage.create({
      data: {
        id: uuidv4(),
        sessionId,
        role,
        content,
        jobId: jobId ?? null,
        runId: runId ?? null,
      },
    });

    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    });

    return {
      ...message,
      role: message.role as MessageRole,
    };
  }

  async getRecentHistory(sessionId: string, maxTurns: number): Promise<ChatMessage[]> {
    const messages = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      take: maxTurns * 2,
    });
    return messages.reverse().map(m => ({
      ...m,
      role: m.role as MessageRole,
    }));
  }
}

export const sessionService = new SessionService();
