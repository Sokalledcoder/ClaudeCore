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
    
    // Actually test the connection using real MCP protocol
    const result = await mcpService.testConnection(server);
    
    if (result.success) {
      await mcpService.updateStatus(req.params.id, 'connected');
      res.json({ 
        success: true, 
        message: `Successfully connected to ${server.name}`,
        server: await mcpService.getById(req.params.id)
      });
    } else {
      await mcpService.updateStatus(req.params.id, 'error', result.error);
      res.status(500).json({ 
        success: false, 
        error: result.error || 'Connection failed'
      });
    }
  } catch (error) {
    next(error);
  }
});

router.post('/servers/:id/discover-tools', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const server = await mcpService.getById(req.params.id);
    
    // Actually discover tools from the MCP server using real protocol
    const discoveredTools = await mcpService.discoverTools(server);
    
    if (discoveredTools.length === 0) {
      // If discovery failed or no tools, return empty but don't error
      res.json([]);
      return;
    }
    
    // Sync discovered tools to database
    const tools = await mcpService.syncTools(server.workspaceId, server.name, discoveredTools);
    res.json(tools);
  } catch (error) {
    next(error);
  }
});

export default router;
