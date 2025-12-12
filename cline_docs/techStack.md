# Technology Stack

## Backend

### Runtime & Language
- **Node.js LTS** (v20+)
- **TypeScript** 5.x with strict mode

### Framework & Server
- **Express** 4.x - HTTP API server
- **Socket.IO** 4.x - WebSocket for streaming

### Database
- **SQLite** - Lightweight, file-based database
- **Prisma** - Type-safe ORM with migrations

### Agent Integration
- **@anthropic-ai/claude-agent-sdk** - Claude Agent SDK for TypeScript
- **@modelcontextprotocol/sdk** - MCP client/server SDK
- **zod** - Schema validation for tool definitions

### Utilities
- **uuid** - ID generation
- **gray-matter** - SKILL.md frontmatter parsing
- **chokidar** - File system watching for Skills

## Frontend

### Framework
- **React** 18.x
- **TypeScript** 5.x
- **Vite** 5.x - Build tool and dev server

### UI Components
- **TailwindCSS** 3.x - Utility-first CSS
- **shadcn/ui** - Component library
- **Lucide React** - Icon library
- **Radix UI** - Headless UI primitives

### State Management
- **Zustand** - Lightweight state management
- **TanStack Query** - Server state & caching

### Visualization
- **@xyflow/react** (React Flow) - Agent/subagent graph
- **recharts** - Timeline charts

### Communication
- **socket.io-client** - WebSocket client

## Testing

### Backend
- **Vitest** - Unit and integration tests
- **supertest** - HTTP API testing

### Frontend
- **Vitest** - Component tests
- **Playwright** - E2E tests

## Development Tools
- **ESLint** - Linting
- **Prettier** - Code formatting
- **concurrently** - Run multiple processes

## Architecture Decisions

### Why SQLite?
- Zero configuration
- File-based, easy to backup
- Sufficient for single-user/team use
- Can migrate to Postgres if needed

### Why Prisma?
- Type-safe database access
- Auto-generated migrations
- Great TypeScript integration

### Why Socket.IO?
- Built-in reconnection
- Room support for sessions
- Fallback transports

### Why shadcn/ui?
- Copy-paste components (not a dependency)
- Highly customizable
- Built on Radix primitives
- TailwindCSS integration
