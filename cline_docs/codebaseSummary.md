# Codebase Summary

## Project Structure

```
agent-control-room/
├── backend/
│   ├── src/
│   │   ├── index.ts              # Entry point
│   │   ├── server.ts             # Express + Socket.IO setup
│   │   ├── types/                # TypeScript types
│   │   │   └── index.ts          # Core entity types
│   │   ├── services/             # Business logic
│   │   │   ├── agent.service.ts  # Claude Agent SDK wrapper
│   │   │   ├── skills.service.ts # Skills management
│   │   │   ├── mcp.service.ts    # MCP server management
│   │   │   ├── jobs.service.ts   # Jobs/Runs harness
│   │   │   ├── trace.service.ts  # Trace event capture
│   │   │   └── context.service.ts# Context engineering
│   │   ├── routes/               # API routes
│   │   │   ├── workspaces.ts
│   │   │   ├── profiles.ts
│   │   │   ├── sessions.ts
│   │   │   ├── skills.ts
│   │   │   ├── mcp.ts
│   │   │   └── jobs.ts
│   │   ├── hooks/                # Agent SDK hooks
│   │   │   └── trace.hooks.ts
│   │   └── utils/                # Helpers
│   ├── prisma/
│   │   └── schema.prisma         # Database schema
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── main.tsx              # Entry point
│   │   ├── App.tsx               # Root component
│   │   ├── components/
│   │   │   ├── ui/               # shadcn/ui components
│   │   │   ├── layout/           # Layout components
│   │   │   ├── chat/             # Chat UI
│   │   │   ├── skills/           # Skills panel
│   │   │   ├── mcp/              # MCP panel
│   │   │   ├── trace/            # Trace visualization
│   │   │   └── context/          # Context inspector
│   │   ├── stores/               # Zustand stores
│   │   ├── hooks/                # Custom hooks
│   │   ├── lib/                  # Utilities
│   │   └── api/                  # API client
│   ├── package.json
│   └── vite.config.ts
│
├── docs/                         # Documentation
├── cline_docs/                   # Project documentation
└── README.md
```

## Key Components and Their Interactions

### Backend Services

1. **AgentService** - Core Claude Agent SDK wrapper
   - Wraps `query()` function with hooks
   - Manages streaming responses
   - Builds MCP server configs
   - Creates context slices

2. **SkillsService** - SKILL.md management
   - Scans filesystem for skills
   - Parses frontmatter metadata
   - CRUD operations for skills
   - Skill generation from chat

3. **MCPService** - MCP server configuration
   - Stores server configs in DB
   - Discovers tools from servers
   - Manages connection status
   - Builds mcpServers for SDK

4. **JobsService** - Harness-like job management
   - Creates and tracks Jobs
   - Manages Runs within Jobs
   - Links runs to chat sessions

5. **TraceService** - Event capture
   - Registers SDK hooks
   - Persists TraceEvents
   - Streams events via WebSocket

6. **ContextService** - Context engineering
   - Builds context slices
   - Manages scratchpad
   - Summarizes history

### Data Flow

```
User → Frontend → Socket.IO → Backend → Agent SDK → Claude API
                                ↓
                           Hooks → TraceService → DB
                                ↓
                           WebSocket → Frontend (real-time updates)
```

### External Dependencies

- **Claude API** - Via Agent SDK (requires ANTHROPIC_API_KEY)
- **MCP Servers** - External processes (stdio) or HTTP services
- **File System** - Skills stored in `.claude/skills/`

## Database Schema (Prisma)

### Core Entities
- Workspace
- AgentProfile
- ChatSession
- ChatMessage
- Job
- Run
- TraceEvent
- MCPServerConfig
- MCPTool
- SkillMetadata
- ContextSnapshot

## Recent Changes
- Initial project setup
- Architecture design complete

## Security Considerations

### Skills
- Treated as potentially untrusted code
- Trusted flag in metadata
- Warnings for untrusted skills

### MCP
- Server configs stored securely
- High-risk tool warnings
- Per-agent tool whitelisting

### API
- Input validation on all routes
- Rate limiting consideration
- CORS configuration
