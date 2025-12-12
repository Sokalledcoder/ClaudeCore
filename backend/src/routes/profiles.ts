import { Router, Request, Response, NextFunction } from 'express';
import { profileService } from '../services/profile.service.js';
import type { CreateAgentProfileInput } from '../types/index.js';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { workspaceId } = req.query;
    if (!workspaceId || typeof workspaceId !== 'string') {
      res.status(400).json({ error: 'workspaceId query parameter is required' });
      return;
    }
    const profiles = await profileService.listByWorkspace(workspaceId);
    res.json(profiles);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await profileService.getById(req.params.id);
    res.json(profile);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input: CreateAgentProfileInput = req.body;
    const profile = await profileService.create(input);
    res.status(201).json(profile);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await profileService.update(req.params.id, req.body);
    res.json(profile);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await profileService.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
