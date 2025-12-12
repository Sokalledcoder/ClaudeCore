# ClaudeCore - Agent Control Room

A full-stack web application for managing Claude AI agents with visual workspace management, configurable agent profiles, and interactive chat sessions.

## Features

- **Workspace Management**: Visual folder browser with ability to create new folders
- **Agent Profiles**: Configure agents with different Claude models and custom system prompts
- **Multi-session Chat**: Chat with Claude via the Agent SDK with streaming responses
- **Skills Management**: Create, edit, and manage filesystem-based SKILL.md files
- **MCP Integration**: Configure and manage Model Context Protocol servers and tools
- **Claude Code CLI Support**: Use your existing Claude Code subscription for authentication

## Tech Stack

### Backend
- Node.js 18+ with TypeScript
- Express + Socket.IO
- JSON file storage (no database required)

### Frontend
- React 18 + TypeScript
- Vite
- TailwindCSS
- Zustand + TanStack Query
- Lucide React icons

## Prerequisites

- Node.js 18 or higher
- npm
- Git

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/Sokalledcoder/ClaudeCore.git
cd ClaudeCore/agent-control-room

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Environment

```bash
# In the backend directory
cd backend
cp .env.example .env
```

Edit `.env` with your settings:
```env
PORT=3005
HOST=localhost
FRONTEND_URL=http://localhost:5173
ANTHROPIC_API_KEY="your-key"  # Optional if using Claude Code CLI
```

### 3. Start Development Servers

**Terminal 1 - Backend:**
```bash
cd agent-control-room/backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd agent-control-room/frontend
npm run dev
```

### 4. Open the App

Navigate to http://localhost:5173 in your browser.

## Project Structure

```
agent-control-room/
├── backend/
│   ├── src/
│   │   ├── services/      # Business logic
│   │   ├── routes/        # API endpoints
│   │   ├── types/         # TypeScript types
│   │   └── utils/         # Helpers
│   └── prisma/
│       └── schema.prisma  # Database schema
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── stores/        # Zustand stores
│   │   ├── api/           # API client
│   │   └── lib/           # Utilities
└── docs/                  # Documentation
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Backend server port | `3005` |
| `HOST` | Backend host | `localhost` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:5173` |
| `ANTHROPIC_API_KEY` | Your Anthropic API key | Optional with CLI |

### Skills Directory

Skills are stored in:
- **User skills**: `~/.claude/skills/`
- **Project skills**: `.claude/skills/` in workspace root

Each skill is a folder containing a `SKILL.md` file with frontmatter metadata.

## API Endpoints

### Workspaces
- `GET /api/workspaces` - List all workspaces
- `POST /api/workspaces` - Create workspace
- `GET /api/workspaces/:id` - Get workspace
- `PUT /api/workspaces/:id` - Update workspace
- `DELETE /api/workspaces/:id` - Delete workspace

### Agent Profiles
- `GET /api/profiles?workspaceId=` - List profiles
- `POST /api/profiles` - Create profile
- `PUT /api/profiles/:id` - Update profile

### Sessions
- `GET /api/sessions?workspaceId=` - List sessions
- `POST /api/sessions` - Create session
- `GET /api/sessions/:id/messages` - Get messages

### Skills
- `GET /api/skills?workspaceId=` - List skills
- `POST /api/skills` - Create skill
- `PUT /api/skills/:slug` - Update skill

### MCP
- `GET /api/mcp/servers?workspaceId=` - List MCP servers
- `POST /api/mcp/servers` - Create server config
- `POST /api/mcp/servers/:id/test` - Test connection
- `GET /api/mcp/tools?workspaceId=` - List tools

### Jobs
- `GET /api/jobs?workspaceId=` - List jobs
- `POST /api/jobs` - Create job
- `GET /api/jobs/:id/runs` - List runs
- `GET /api/jobs/runs/:runId/trace` - Get trace events

## WebSocket Events

### Client → Server
- `join-session` - Join a chat session room
- `send-message` - Send a message to the agent
- `cancel-run` - Cancel an active run

### Server → Client
- `message` - Streaming message chunks
- `trace-event` - Real-time trace events

## Security Considerations

### Skills
- Skills are treated as potentially untrusted code
- Mark skills as "trusted" only if you've reviewed them
- Warnings are displayed for untrusted skills

### MCP Servers
- High-risk tools (file write, bash, etc.) are flagged
- Review server configurations before enabling
- Use narrow-scoped tools when possible

## Development

### Running Tests

```bash
# Backend tests
cd backend
npm run test

# Frontend tests
cd frontend
npm run test

# E2E tests
cd frontend
npm run test:e2e
```

### Building for Production

```bash
# Backend
cd backend
npm run build

# Frontend
cd frontend
npm run build
```

## Known Limitations

1. **Claude Agent SDK**: Requires the `@anthropic-ai/claude-agent-sdk` package which may need special access
2. **MCP Tool Discovery**: Currently uses mock tool discovery; real implementation requires MCP client
3. **Graph Visualization**: Agent/subagent graph view is planned but not yet implemented

## Troubleshooting

### "Cannot find module" errors
Run `npm install` in both `backend/` and `frontend/` directories.

### Data storage
Data is stored as JSON files in `backend/src/data/`. No database setup required.

### API connection issues
Ensure the backend is running on port 3005 and frontend on port 5173.

## License

MIT
