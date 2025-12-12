import { Router, Request, Response, NextFunction } from 'express';
import { jobsService } from '../services/jobs.service.js';
import { traceService } from '../services/trace.service.js';
import { agentService } from '../services/agent.service.js';
import type { CreateJobInput } from '../types/index.js';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { workspaceId } = req.query;
    if (!workspaceId || typeof workspaceId !== 'string') {
      res.status(400).json({ error: 'workspaceId query parameter is required' });
      return;
    }
    const jobs = await jobsService.listByWorkspace(workspaceId);
    res.json(jobs);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const job = await jobsService.getById(req.params.id);
    res.json(job);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input: CreateJobInput = req.body;
    const job = await jobsService.create(input);
    res.status(201).json(job);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/cancel', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const job = await jobsService.cancelJob(req.params.id);
    
    const runs = await jobsService.listRunsByJob(req.params.id);
    for (const run of runs) {
      if (run.status === 'running') {
        agentService.cancelRun(run.id);
      }
    }
    
    res.json(job);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await jobsService.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.get('/:id/runs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const runs = await jobsService.listRunsByJob(req.params.id);
    res.json(runs);
  } catch (error) {
    next(error);
  }
});

router.get('/runs/:runId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const run = await jobsService.getRunById(req.params.runId);
    res.json(run);
  } catch (error) {
    next(error);
  }
});

router.get('/runs/:runId/trace', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const events = await traceService.listByRun(req.params.runId);
    res.json(events);
  } catch (error) {
    next(error);
  }
});

router.get('/runs/:runId/context', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const snapshots = await traceService.listSnapshotsByRun(req.params.runId);
    res.json(snapshots);
  } catch (error) {
    next(error);
  }
});

export default router;
