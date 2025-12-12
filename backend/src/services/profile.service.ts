import { v4 as uuidv4 } from 'uuid';
import prisma from '../utils/db.js';
import { NotFoundError } from '../utils/errors.js';
import { parseJsonField, stringifyJsonField } from '../utils/json.js';
import type { AgentProfile, CreateAgentProfileInput } from '../types/index.js';

function mapDbToProfile(db: {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  model: string;
  systemPromptPreset: string;
  customSystemPromptAppend: string | null;
  allowedTools: string;
  enabledSkillScopes: string;
  enabledMcpServers: string;
  maxTurnsInHistory: number;
  maxDocTokens: number;
  enableScratchpad: boolean;
  createdAt: Date;
  updatedAt: Date;
}): AgentProfile {
  return {
    ...db,
    systemPromptPreset: db.systemPromptPreset as 'claude_code' | 'plain' | 'custom',
    allowedTools: parseJsonField<string[]>(db.allowedTools, []),
    enabledSkillScopes: parseJsonField<('user' | 'project')[]>(db.enabledSkillScopes, ['user', 'project']),
    enabledMcpServers: parseJsonField<string[]>(db.enabledMcpServers, []),
  };
}

export class ProfileService {
  async listByWorkspace(workspaceId: string): Promise<AgentProfile[]> {
    const profiles = await prisma.agentProfile.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
    return profiles.map(mapDbToProfile);
  }

  async getById(id: string): Promise<AgentProfile> {
    const profile = await prisma.agentProfile.findUnique({
      where: { id },
    });
    if (!profile) {
      throw new NotFoundError('AgentProfile', id);
    }
    return mapDbToProfile(profile);
  }

  async create(input: CreateAgentProfileInput): Promise<AgentProfile> {
    const profile = await prisma.agentProfile.create({
      data: {
        id: uuidv4(),
        workspaceId: input.workspaceId,
        name: input.name,
        description: input.description ?? '',
        model: input.model ?? 'claude-sonnet-4-20250514',
        systemPromptPreset: input.systemPromptPreset ?? 'claude_code',
        customSystemPromptAppend: input.customSystemPromptAppend ?? null,
        allowedTools: stringifyJsonField(input.allowedTools ?? []),
        enabledSkillScopes: stringifyJsonField(input.enabledSkillScopes ?? ['user', 'project']),
        enabledMcpServers: stringifyJsonField(input.enabledMcpServers ?? []),
        maxTurnsInHistory: input.maxTurnsInHistory ?? 50,
        maxDocTokens: input.maxDocTokens ?? 50000,
        enableScratchpad: input.enableScratchpad ?? true,
      },
    });
    return mapDbToProfile(profile);
  }

  async update(id: string, input: Partial<CreateAgentProfileInput>): Promise<AgentProfile> {
    await this.getById(id);
    
    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.description !== undefined) data.description = input.description;
    if (input.model !== undefined) data.model = input.model;
    if (input.systemPromptPreset !== undefined) data.systemPromptPreset = input.systemPromptPreset;
    if (input.customSystemPromptAppend !== undefined) data.customSystemPromptAppend = input.customSystemPromptAppend;
    if (input.allowedTools !== undefined) data.allowedTools = stringifyJsonField(input.allowedTools);
    if (input.enabledSkillScopes !== undefined) data.enabledSkillScopes = stringifyJsonField(input.enabledSkillScopes);
    if (input.enabledMcpServers !== undefined) data.enabledMcpServers = stringifyJsonField(input.enabledMcpServers);
    if (input.maxTurnsInHistory !== undefined) data.maxTurnsInHistory = input.maxTurnsInHistory;
    if (input.maxDocTokens !== undefined) data.maxDocTokens = input.maxDocTokens;
    if (input.enableScratchpad !== undefined) data.enableScratchpad = input.enableScratchpad;

    const profile = await prisma.agentProfile.update({
      where: { id },
      data,
    });
    return mapDbToProfile(profile);
  }

  async delete(id: string): Promise<void> {
    await this.getById(id);
    await prisma.agentProfile.delete({
      where: { id },
    });
  }
}

export const profileService = new ProfileService();
