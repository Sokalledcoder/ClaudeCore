import { v4 as uuidv4 } from 'uuid';
import prisma from '../utils/db.js';
import { NotFoundError } from '../utils/errors.js';
import type { Job, Run, JobStatus, RunStatus, CreateJobInput } from '../types/index.js';

export class JobsService {
  async listByWorkspace(workspaceId: string): Promise<Job[]> {
    const jobs = await prisma.job.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
    return jobs.map(j => ({
      ...j,
      status: j.status as JobStatus,
    }));
  }

  async getById(id: string): Promise<Job> {
    const job = await prisma.job.findUnique({
      where: { id },
    });
    if (!job) {
      throw new NotFoundError('Job', id);
    }
    return {
      ...job,
      status: job.status as JobStatus,
    };
  }

  async create(input: CreateJobInput): Promise<Job> {
    const job = await prisma.job.create({
      data: {
        id: uuidv4(),
        workspaceId: input.workspaceId,
        agentProfileId: input.agentProfileId,
        title: input.title,
        description: input.description ?? '',
        status: 'queued',
      },
    });
    return {
      ...job,
      status: job.status as JobStatus,
    };
  }

  async updateStatus(id: string, status: JobStatus): Promise<Job> {
    const job = await prisma.job.update({
      where: { id },
      data: { status },
    });
    return {
      ...job,
      status: job.status as JobStatus,
    };
  }

  async delete(id: string): Promise<void> {
    await this.getById(id);
    await prisma.job.delete({
      where: { id },
    });
  }

  async listRunsByJob(jobId: string): Promise<Run[]> {
    const runs = await prisma.run.findMany({
      where: { jobId },
      orderBy: { startedAt: 'desc' },
    });
    return runs.map(r => ({
      ...r,
      status: r.status as RunStatus,
    }));
  }

  async getRunById(id: string): Promise<Run> {
    const run = await prisma.run.findUnique({
      where: { id },
    });
    if (!run) {
      throw new NotFoundError('Run', id);
    }
    return {
      ...run,
      status: run.status as RunStatus,
    };
  }

  async createRun(jobId: string, sessionId?: string): Promise<Run> {
    await prisma.job.update({
      where: { id: jobId },
      data: { status: 'running' },
    });

    const run = await prisma.run.create({
      data: {
        id: uuidv4(),
        jobId,
        sessionId: sessionId ?? null,
        status: 'running',
      },
    });
    return {
      ...run,
      status: run.status as RunStatus,
    };
  }

  async completeRun(id: string, status: RunStatus, finalText?: string): Promise<Run> {
    const run = await prisma.run.update({
      where: { id },
      data: {
        status,
        finalText: finalText ?? null,
        finishedAt: new Date(),
      },
    });

    const job = await prisma.job.findUnique({
      where: { id: run.jobId },
      include: { runs: true },
    });

    if (job) {
      const allRuns = job.runs;
      const hasRunning = allRuns.some(r => r.status === 'running');
      const hasError = allRuns.some(r => r.status === 'error');
      const allSuccess = allRuns.every(r => r.status === 'success');

      let jobStatus: JobStatus = 'running';
      if (!hasRunning) {
        if (hasError) {
          jobStatus = 'error';
        } else if (allSuccess) {
          jobStatus = 'success';
        }
      }

      await prisma.job.update({
        where: { id: job.id },
        data: { status: jobStatus },
      });
    }

    return {
      ...run,
      status: run.status as RunStatus,
    };
  }

  async cancelJob(id: string): Promise<Job> {
    await prisma.run.updateMany({
      where: { jobId: id, status: 'running' },
      data: { status: 'error', finishedAt: new Date() },
    });

    const job = await prisma.job.update({
      where: { id },
      data: { status: 'cancelled' },
    });

    return {
      ...job,
      status: job.status as JobStatus,
    };
  }
}

export const jobsService = new JobsService();
