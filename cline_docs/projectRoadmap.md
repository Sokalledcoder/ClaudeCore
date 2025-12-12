# Agent Control Room / Skill Studio - Project Roadmap

## Project Overview
A full-stack web application for managing Claude-based agents with multi-session chat, agent/subagent visualization, Skills management, MCP server configuration, and context engineering support.

## High-Level Goals

### Phase 1: Core Infrastructure ✅
- [x] Research Claude Agent SDK, MCP, Skills documentation
- [x] Design data models and architecture
- [ ] Set up project structure (monorepo with backend + frontend)
- [ ] Configure database (SQLite with Prisma)
- [ ] Implement core TypeScript types

### Phase 2: Backend Core
- [ ] Agent SDK wrapper service with hooks
- [ ] Skills service (filesystem-based SKILL.md management)
- [ ] MCP server configuration service
- [ ] Jobs/Runs harness system
- [ ] Trace event capture and storage
- [ ] Context engineering slices

### Phase 3: Backend API
- [ ] REST API routes for all entities
- [ ] WebSocket server for streaming chat
- [ ] Real-time trace event streaming

### Phase 4: Frontend Core
- [ ] React + Vite + TypeScript setup
- [ ] UI component library (shadcn/ui + Tailwind)
- [ ] Main layout with sidebar panels
- [ ] Chat interface with streaming

### Phase 5: Frontend Features
- [ ] Skills management panel
- [ ] MCP servers panel
- [ ] Trace visualization (timeline + graph)
- [ ] Context inspector panel
- [ ] Jobs/Runs view

### Phase 6: Testing & Hardening
- [ ] Unit tests for backend services
- [ ] Integration tests for API
- [ ] E2E tests with Playwright
- [ ] Security review and hardening

### Phase 7: Documentation
- [ ] README with setup instructions
- [ ] Developer documentation
- [ ] Example Skills

## Completion Criteria
1. Multi-session streaming chat with Claude Agent SDK
2. Visual trace timeline and agent/subagent graph
3. Full CRUD for Skills (SKILL.md)
4. MCP server configuration and tool discovery
5. Jobs/Runs tracking with trace events
6. Context slices visualization and steering
7. All tests passing
8. Documentation complete

## Technology Stack
- **Backend**: Node.js, TypeScript, Express, Prisma, SQLite
- **Frontend**: React, TypeScript, Vite, TailwindCSS, shadcn/ui
- **Agent**: @anthropic-ai/claude-agent-sdk
- **MCP**: @modelcontextprotocol/sdk
- **Testing**: Vitest, Playwright

## Completed Tasks
- Research phase complete (Claude Agent SDK, MCP, Skills, context engineering)
- Architecture design complete
