import { v4 as uuidv4 } from 'uuid';
import prisma from '../utils/db.js';
import { NotFoundError } from '../utils/errors.js';
import type { Workspace, CreateWorkspaceInput } from '../types/index.js';

export class WorkspaceService {
  async list(): Promise<Workspace[]> {
    const workspaces = await prisma.workspace.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return workspaces;
  }

  async getById(id: string): Promise<Workspace> {
    const workspace = await prisma.workspace.findUnique({
      where: { id },
    });
    if (!workspace) {
      throw new NotFoundError('Workspace', id);
    }
    return workspace;
  }

  async create(input: CreateWorkspaceInput): Promise<Workspace> {
    const workspace = await prisma.workspace.create({
      data: {
        id: uuidv4(),
        name: input.name,
        projectRoot: input.projectRoot,
      },
    });
    return workspace;
  }

  async update(id: string, data: Partial<CreateWorkspaceInput>): Promise<Workspace> {
    await this.getById(id);
    const workspace = await prisma.workspace.update({
      where: { id },
      data,
    });
    return workspace;
  }

  async delete(id: string): Promise<void> {
    await this.getById(id);
    await prisma.workspace.delete({
      where: { id },
    });
  }
}

export const workspaceService = new WorkspaceService();
