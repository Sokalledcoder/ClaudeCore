import { Router, Request, Response, NextFunction } from 'express';
import { skillsService } from '../services/skills.service.js';
import { workspaceService } from '../services/workspace.service.js';
import type { CreateSkillInput } from '../types/index.js';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { workspaceId } = req.query;
    if (!workspaceId || typeof workspaceId !== 'string') {
      res.status(400).json({ error: 'workspaceId query parameter is required' });
      return;
    }
    const skills = await skillsService.listByWorkspace(workspaceId);
    res.json(skills);
  } catch (error) {
    next(error);
  }
});

router.get('/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { workspaceId } = req.query;
    if (!workspaceId || typeof workspaceId !== 'string') {
      res.status(400).json({ error: 'workspaceId query parameter is required' });
      return;
    }
    const skill = await skillsService.getBySlug(workspaceId, req.params.slug);
    res.json(skill);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input: CreateSkillInput = req.body;
    const workspace = await workspaceService.getById(input.workspaceId);
    const skill = await skillsService.create(input, workspace.projectRoot);
    res.status(201).json(skill);
  } catch (error) {
    next(error);
  }
});

router.put('/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { workspaceId } = req.query;
    if (!workspaceId || typeof workspaceId !== 'string') {
      res.status(400).json({ error: 'workspaceId query parameter is required' });
      return;
    }
    const skill = await skillsService.update(workspaceId, req.params.slug, req.body);
    res.json(skill);
  } catch (error) {
    next(error);
  }
});

router.delete('/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { workspaceId } = req.query;
    if (!workspaceId || typeof workspaceId !== 'string') {
      res.status(400).json({ error: 'workspaceId query parameter is required' });
      return;
    }
    await skillsService.delete(workspaceId, req.params.slug);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.post('/import', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { workspaceId, paths, scope } = req.body;
    if (!workspaceId || !paths || !Array.isArray(paths)) {
      res.status(400).json({ error: 'workspaceId and paths array are required' });
      return;
    }
    const workspace = await workspaceService.getById(workspaceId);
    const importedSkills = await skillsService.importFromPaths(
      workspaceId,
      workspace.projectRoot,
      paths,
      scope || 'project'
    );
    res.status(201).json(importedSkills);
  } catch (error) {
    next(error);
  }
});

router.post('/generate-from-chat', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { workspaceId, chatHistory, skillName } = req.body;
    if (!workspaceId || !chatHistory || !skillName) {
      res.status(400).json({ error: 'workspaceId, chatHistory, and skillName are required' });
      return;
    }
    const workspace = await workspaceService.getById(workspaceId);
    const content = await skillsService.generateSkillFromChat(
      workspaceId,
      workspace.projectRoot,
      chatHistory,
      skillName
    );
    res.json({ content });
  } catch (error) {
    next(error);
  }
});

export default router;
