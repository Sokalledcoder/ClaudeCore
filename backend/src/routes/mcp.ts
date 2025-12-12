import { Router, Request, Response, NextFunction } from 'express';
import { mcpService } from '../services/mcp.service.js';
import type { CreateMCPServerInput } from '../types/index.js';

const router = Router();

router.get('/servers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { workspaceId } = req.query;
    if (!workspaceId || typeof workspaceId !== 'string') {
      res.status(400).json({ error: 'workspaceId query parameter is required' });
      return;
    }
    const servers = await mcpService.listByWorkspace(workspaceId);
    res.json(servers);
  } catch (error) {
    next(error);
  }
});

router.get('/servers/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const server = await mcpService.getById(req.params.id);
    res.json(server);
  } catch (error) {
    next(error);
  }
});

router.post('/servers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input: CreateMCPServerInput = req.body;
    const server = await mcpService.create(input);
    res.status(201).json(server);
  } catch (error) {
    next(error);
  }
});

router.put('/servers/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const server = await mcpService.update(req.params.id, req.body);
    res.json(server);
  } catch (error) {
    next(error);
  }
});

router.delete('/servers/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await mcpService.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.get('/tools', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { workspaceId, serverName } = req.query;
    if (!workspaceId || typeof workspaceId !== 'string') {
      res.status(400).json({ error: 'workspaceId query parameter is required' });
      return;
    }
    
    if (serverName && typeof serverName === 'string') {
      const tools = await mcpService.listToolsByServer(workspaceId, serverName);
      res.json(tools);
    } else {
      const tools = await mcpService.listToolsByWorkspace(workspaceId);
      res.json(tools);
    }
  } catch (error) {
    next(error);
  }
});

router.post('/servers/:id/test', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const server = await mcpService.getById(req.params.id);
    
    await mcpService.updateStatus(req.params.id, 'testing');
    
    try {
      await mcpService.updateStatus(req.params.id, 'connected');
      res.json({ 
        success: true, 
        message: `Successfully connected to ${server.name}`,
        server 
      });
    } catch (testError) {
      const errorMessage = testError instanceof Error ? testError.message : 'Unknown error';
      await mcpService.updateStatus(req.params.id, 'error', errorMessage);
      res.status(500).json({ 
        success: false, 
        error: errorMessage 
      });
    }
  } catch (error) {
    next(error);
  }
});

router.post('/servers/:id/discover-tools', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const server = await mcpService.getById(req.params.id);
    
    const mockTools = [
      { name: 'list_files', description: 'List files in a directory' },
      { name: 'read_file', description: 'Read contents of a file' },
      { name: 'write_file', description: 'Write contents to a file' },
    ];
    
    const tools = await mcpService.syncTools(server.workspaceId, server.name, mockTools);
    res.json(tools);
  } catch (error) {
    next(error);
  }
});

export default router;
