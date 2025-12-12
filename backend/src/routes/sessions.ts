import { Router, Request, Response, NextFunction } from 'express';
import { sessionService } from '../services/session.service.js';
import type { CreateChatSessionInput } from '../types/index.js';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { workspaceId } = req.query;
    if (!workspaceId || typeof workspaceId !== 'string') {
      res.status(400).json({ error: 'workspaceId query parameter is required' });
      return;
    }
    const sessions = await sessionService.listByWorkspace(workspaceId);
    res.json(sessions);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const session = await sessionService.getById(req.params.id);
    res.json(session);
  } catch (error) {
    next(error);
  }
});

router.get('/:id/messages', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const messages = await sessionService.getMessages(req.params.id, limit);
    res.json(messages);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input: CreateChatSessionInput = req.body;
    const session = await sessionService.create(input);
    res.status(201).json(session);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const session = await sessionService.update(req.params.id, req.body);
    res.json(session);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await sessionService.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
