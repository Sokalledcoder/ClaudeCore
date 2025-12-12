import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { AppError } from './utils/errors.js';
import { agentService } from './services/agent.service.js';
import { jobsService } from './services/jobs.service.js';

import workspacesRouter from './routes/workspaces.js';
import profilesRouter from './routes/profiles.js';
import sessionsRouter from './routes/sessions.js';
import skillsRouter from './routes/skills.js';
import mcpRouter from './routes/mcp.js';
import jobsRouter from './routes/jobs.js';
import settingsRouter from './routes/settings.js';
import filesystemRouter from './routes/filesystem.js';

export function createApp() {
  const app = express();
  const httpServer = createServer(app);
  
  const io = new SocketServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
      methods: ['GET', 'POST'],
    },
  });

  app.use(cors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
  }));
  app.use(express.json({ limit: '10mb' }));

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api/workspaces', workspacesRouter);
  app.use('/api/profiles', profilesRouter);
  app.use('/api/sessions', sessionsRouter);
  app.use('/api/skills', skillsRouter);
  app.use('/api/mcp', mcpRouter);
  app.use('/api/jobs', jobsRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/filesystem', filesystemRouter);

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('join-session', (sessionId: string) => {
      socket.join(`session:${sessionId}`);
      console.log(`Client ${socket.id} joined session ${sessionId}`);
    });

    socket.on('leave-session', (sessionId: string) => {
      socket.leave(`session:${sessionId}`);
      console.log(`Client ${socket.id} left session ${sessionId}`);
    });

    socket.on('join-run', (runId: string) => {
      socket.join(`run:${runId}`);
      console.log(`Client ${socket.id} joined run ${runId}`);
    });

    socket.on('leave-run', (runId: string) => {
      socket.leave(`run:${runId}`);
      console.log(`Client ${socket.id} left run ${runId}`);
    });

    socket.on('send-message', async (data: { sessionId: string; content: string; jobId?: string }) => {
      const { sessionId, content, jobId } = data;
      
      try {
        await agentService.runChat({
          sessionId,
          prompt: content,
          jobId,
          onMessage: (message) => {
            io.to(`session:${sessionId}`).emit('message', message);
            
            if (message.traceEvent && jobId) {
              jobsService.listRunsByJob(jobId).then(runs => {
                const activeRun = runs.find(r => r.status === 'running');
                if (activeRun) {
                  io.to(`run:${activeRun.id}`).emit('trace-event', message.traceEvent);
                }
              });
            }
          },
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        socket.emit('error', { error: errorMessage });
      }
    });

    socket.on('cancel-run', (runId: string) => {
      const cancelled = agentService.cancelRun(runId);
      socket.emit('run-cancelled', { runId, cancelled });
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Error:', err);

    if (err instanceof AppError) {
      res.status(err.statusCode).json({
        error: err.message,
        code: err.code,
      });
      return;
    }

    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  });

  return { app, httpServer, io };
}
