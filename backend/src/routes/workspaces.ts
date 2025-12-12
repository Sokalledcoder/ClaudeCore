import { Router, Request, Response, NextFunction } from 'express';
import { workspaceService } from '../services/workspace.service.js';
import { skillsService } from '../services/skills.service.js';
import type { CreateWorkspaceInput } from '../types/index.js';

const router = Router();

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const workspaces = await workspaceService.list();
    res.json(workspaces);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const workspace = await workspaceService.getById(req.params.id);
    res.json(workspace);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input: CreateWorkspaceInput = req.body;
    const workspace = await workspaceService.create(input);
    
    await skillsService.scanSkills(workspace.id, workspace.projectRoot);
    
    res.status(201).json(workspace);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const workspace = await workspaceService.update(req.params.id, req.body);
    res.json(workspace);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await workspaceService.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.post('/:id/scan-skills', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const workspace = await workspaceService.getById(req.params.id);
    const skills = await skillsService.scanSkills(workspace.id, workspace.projectRoot);
    res.json(skills);
  } catch (error) {
    next(error);
  }
});

export default router;
