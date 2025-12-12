import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import matter from 'gray-matter';
import prisma from '../utils/db.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import type { SkillMetadata, CreateSkillInput, SkillScope } from '../types/index.js';

const USER_SKILLS_DIR = process.env.USER_SKILLS_DIR?.replace('~', os.homedir()) ?? 
  path.join(os.homedir(), '.claude', 'skills');

export class SkillsService {
  private getProjectSkillsDir(projectRoot: string): string {
    return path.join(projectRoot, '.claude', 'skills');
  }

  async scanSkills(workspaceId: string, projectRoot: string): Promise<SkillMetadata[]> {
    const skills: SkillMetadata[] = [];

    const userSkills = await this.scanDirectory(workspaceId, USER_SKILLS_DIR, 'user');
    skills.push(...userSkills);

    const projectSkillsDir = this.getProjectSkillsDir(projectRoot);
    const projectSkills = await this.scanDirectory(workspaceId, projectSkillsDir, 'project');
    skills.push(...projectSkills);

    await this.syncSkillsToDb(workspaceId, skills);

    return skills;
  }

  private async scanDirectory(
    workspaceId: string,
    dir: string,
    scope: SkillScope
  ): Promise<SkillMetadata[]> {
    const skills: SkillMetadata[] = [];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        
        const skillPath = path.join(dir, entry.name, 'SKILL.md');
        try {
          const content = await fs.readFile(skillPath, 'utf-8');
          const { data: frontmatter } = matter(content);
          
          skills.push({
            id: uuidv4(),
            workspaceId,
            slug: entry.name,
            path: skillPath,
            name: (frontmatter.name as string) ?? entry.name,
            description: (frontmatter.description as string) ?? '',
            scope,
            trusted: (frontmatter.trusted as boolean) ?? false,
            lastIndexedAt: new Date(),
          });
        } catch {
          // Skip directories without SKILL.md
        }
      }
    } catch {
      // Directory doesn't exist
    }

    return skills;
  }

  private async syncSkillsToDb(workspaceId: string, skills: SkillMetadata[]): Promise<void> {
    for (const skill of skills) {
      await prisma.skillMetadata.upsert({
        where: {
          workspaceId_slug: { workspaceId, slug: skill.slug },
        },
        update: {
          path: skill.path,
          name: skill.name,
          description: skill.description,
          scope: skill.scope,
          trusted: skill.trusted,
          lastIndexedAt: skill.lastIndexedAt,
        },
        create: {
          id: skill.id,
          workspaceId,
          slug: skill.slug,
          path: skill.path,
          name: skill.name,
          description: skill.description,
          scope: skill.scope,
          trusted: skill.trusted,
          lastIndexedAt: skill.lastIndexedAt,
        },
      });
    }
  }

  async listByWorkspace(workspaceId: string): Promise<SkillMetadata[]> {
    const skills = await prisma.skillMetadata.findMany({
      where: { workspaceId },
      orderBy: { name: 'asc' },
    });
    return skills.map(s => ({
      ...s,
      scope: s.scope as SkillScope,
    }));
  }

  async getBySlug(workspaceId: string, slug: string): Promise<{ metadata: SkillMetadata; content: string }> {
    const skill = await prisma.skillMetadata.findUnique({
      where: { workspaceId_slug: { workspaceId, slug } },
    });
    if (!skill) {
      throw new NotFoundError('Skill', slug);
    }

    const content = await fs.readFile(skill.path, 'utf-8');
    return {
      metadata: { ...skill, scope: skill.scope as SkillScope },
      content,
    };
  }

  async create(input: CreateSkillInput, projectRoot: string): Promise<SkillMetadata> {
    const scope = input.scope ?? 'project';
    const baseDir = scope === 'user' ? USER_SKILLS_DIR : this.getProjectSkillsDir(projectRoot);
    const skillDir = path.join(baseDir, input.slug);
    const skillPath = path.join(skillDir, 'SKILL.md');

    try {
      await fs.access(skillDir);
      throw new ValidationError(`Skill with slug "${input.slug}" already exists`);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw err;
      }
    }

    await fs.mkdir(skillDir, { recursive: true });

    const frontmatter = {
      name: input.name,
      description: input.description ?? '',
      trusted: input.trusted ?? false,
    };
    const fullContent = matter.stringify(input.content, frontmatter);
    await fs.writeFile(skillPath, fullContent, 'utf-8');

    const skill: SkillMetadata = {
      id: uuidv4(),
      workspaceId: input.workspaceId,
      slug: input.slug,
      path: skillPath,
      name: input.name,
      description: input.description ?? '',
      scope,
      trusted: input.trusted ?? false,
      lastIndexedAt: new Date(),
    };

    await prisma.skillMetadata.create({
      data: skill,
    });

    return skill;
  }

  async update(
    workspaceId: string,
    slug: string,
    data: { name?: string; description?: string; content?: string; trusted?: boolean }
  ): Promise<SkillMetadata> {
    const { metadata, content: currentContent } = await this.getBySlug(workspaceId, slug);
    const { data: frontmatter, content: body } = matter(currentContent);

    if (data.name !== undefined) frontmatter.name = data.name;
    if (data.description !== undefined) frontmatter.description = data.description;
    if (data.trusted !== undefined) frontmatter.trusted = data.trusted;

    const newBody = data.content ?? body;
    const fullContent = matter.stringify(newBody, frontmatter);
    await fs.writeFile(metadata.path, fullContent, 'utf-8');

    const updated = await prisma.skillMetadata.update({
      where: { workspaceId_slug: { workspaceId, slug } },
      data: {
        name: data.name ?? metadata.name,
        description: data.description ?? metadata.description,
        trusted: data.trusted ?? metadata.trusted,
        lastIndexedAt: new Date(),
      },
    });

    return { ...updated, scope: updated.scope as SkillScope };
  }

  async delete(workspaceId: string, slug: string): Promise<void> {
    const { metadata } = await this.getBySlug(workspaceId, slug);
    const skillDir = path.dirname(metadata.path);

    await fs.rm(skillDir, { recursive: true, force: true });
    await prisma.skillMetadata.delete({
      where: { workspaceId_slug: { workspaceId, slug } },
    });
  }

  async generateSkillFromChat(
    workspaceId: string,
    projectRoot: string,
    chatHistory: { role: string; content: string }[],
    skillName: string
  ): Promise<string> {
    const historyText = chatHistory
      .map(m => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n\n');

    const skillContent = `# ${skillName}

## Description
This skill was generated from a chat conversation.

## Instructions

Based on the conversation below, follow these steps:

${historyText}

## Usage
Use this skill when you need to perform similar tasks.
`;

    return skillContent;
  }
}

export const skillsService = new SkillsService();
