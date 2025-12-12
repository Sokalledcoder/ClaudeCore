# ClaudeCore Agent Control Room - LLM Development Guide

This document provides comprehensive instructions for AI assistants (LLMs) to understand, maintain, and extend this project.

## Project Overview

**ClaudeCore Agent Control Room** is a full-stack web application that provides a visual interface for managing and interacting with Claude AI agents. It leverages the Claude Agent SDK to create configurable agent profiles, manage workspaces, and run interactive chat sessions.

### Architecture

```
agent-control-room/
├── backend/          # Node.js/Express API server (port 3005)
│   ├── src/
│   │   ├── server.ts         # Main server entry point
│   │   ├── routes/           # API route handlers
│   │   ├── services/         # Business logic
│   │   └── data/             # JSON file storage
│   └── package.json
├── frontend/         # React/Vite SPA (port 5173)
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── api/              # API client
│   │   ├── stores/           # Zustand state management
│   │   └── App.tsx           # Main app component
│   └── package.json
└── docs/             # Documentation
```

## Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Real-time**: Socket.IO for WebSocket communication
- **Storage**: JSON files (no database required)
- **Port**: 3005 (configurable via .env)

### Frontend
- **Framework**: React 18 with Vite
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Icons**: Lucide React
- **Port**: 5173 (Vite default)

## Starting the Project

### Prerequisites
- Node.js 18 or higher
- npm or yarn

### Step 1: Install Dependencies

```bash
# Backend
cd agent-control-room/backend
npm install

# Frontend
cd ../frontend
npm install
```

### Step 2: Configure Environment

```bash
cd backend
cp .env.example .env
```

Edit `.env`:
```env
PORT=3005
HOST=localhost
FRONTEND_URL=http://localhost:5173
ANTHROPIC_API_KEY="your-key"  # Optional if using Claude Code CLI auth
```

### Step 3: Start Servers

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

### Step 4: Access
Open `http://localhost:5173` in browser.

## API Endpoints

### Workspaces
- `GET /api/workspaces` - List all
- `POST /api/workspaces` - Create (body: `{name, projectRoot}`)
- `PUT /api/workspaces/:id` - Update
- `DELETE /api/workspaces/:id` - Delete

### Profiles
- `GET /api/profiles?workspaceId=` - List for workspace
- `POST /api/profiles` - Create (body: `{workspaceId, name, model, systemPrompt}`)
- `PUT /api/profiles/:id` - Update
- `DELETE /api/profiles/:id` - Delete

### Sessions
- `GET /api/sessions?workspaceId=` - List
- `POST /api/sessions` - Create
- `DELETE /api/sessions/:id` - Delete

### Filesystem
- `GET /api/filesystem/browse?path=` - Browse directories
- `GET /api/filesystem/quick-paths` - Get common paths
- `POST /api/filesystem/create-folder` - Create folder (body: `{parentPath, folderName}`)

### Settings
- `GET /api/settings` - Get settings
- `PUT /api/settings` - Update settings
- `GET /api/settings/check-claude-code` - Check CLI status

## Available Claude Models (December 2025)

| Model ID | Name | Description |
|----------|------|-------------|
| `claude-sonnet-4-5-20250929` | Claude Sonnet 4.5 | Best for agents and coding |
| `claude-sonnet-4-5-20250929-1m` | Claude Sonnet 4.5 (1M) | Extended context |
| `claude-opus-4-5-20251101` | Claude Opus 4.5 | Maximum capability |
| `claude-haiku-4-5-20251001` | Claude Haiku 4.5 | Fast with extended thinking |

## Key Files Reference

| Purpose | File |
|---------|------|
| Backend entry | `backend/src/server.ts` |
| API routes | `backend/src/routes/*.ts` |
| Frontend entry | `frontend/src/main.tsx` |
| Components | `frontend/src/components/` |
| API client | `frontend/src/api/client.ts` |
| State stores | `frontend/src/stores/` |

## Adding New Features

### New API Endpoint
1. Create route in `backend/src/routes/newroute.ts`
2. Import and register in `backend/src/server.ts`
3. Add to `frontend/src/api/client.ts`

### New Dialog
1. Create in `frontend/src/components/dialogs/`
2. Add state and import in `Sidebar.tsx`
3. Add trigger button

## Troubleshooting

### Port in use
```bash
lsof -i :3005  # Check backend port
lsof -i :5173  # Check frontend port
```

### Frontend can't reach backend
Check `frontend/vite.config.ts` proxy points to `http://localhost:3005`

## Data Storage

Data stored as JSON in `backend/src/data/`:
- `workspaces.json`
- `profiles.json`
- `sessions.json`
