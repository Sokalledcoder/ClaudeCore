import 'dotenv/config';
import { createApp } from './server.js';

const PORT = parseInt(process.env.PORT ?? '3001', 10);
const HOST = process.env.HOST ?? 'localhost';

async function main() {
  const { httpServer } = createApp();

  httpServer.listen(PORT, HOST, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🚀 Agent Control Room Backend                            ║
║                                                            ║
║   Server running at: http://${HOST}:${PORT}                   ║
║   Health check: http://${HOST}:${PORT}/health                 ║
║                                                            ║
║   API Endpoints:                                           ║
║   - GET  /api/workspaces                                   ║
║   - GET  /api/profiles?workspaceId=                        ║
║   - GET  /api/sessions?workspaceId=                        ║
║   - GET  /api/skills?workspaceId=                          ║
║   - GET  /api/mcp/servers?workspaceId=                     ║
║   - GET  /api/jobs?workspaceId=                            ║
║                                                            ║
║   WebSocket Events:                                        ║
║   - join-session, send-message, cancel-run                 ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    `);
  });
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
