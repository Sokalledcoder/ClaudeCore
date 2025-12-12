import { create } from 'zustand';
import type { Workspace, AgentProfile, ChatSession, ChatMessage, SkillMetadata, MCPServerConfig, MCPTool, Job, Run, TraceEvent } from '../api/client';

interface AppState {
  currentWorkspace: Workspace | null;
  currentProfile: AgentProfile | null;
  currentSession: ChatSession | null;
  currentJob: Job | null;
  currentRun: Run | null;

  workspaces: Workspace[];
  profiles: AgentProfile[];
  sessions: ChatSession[];
  messages: ChatMessage[];
  skills: SkillMetadata[];
  mcpServers: MCPServerConfig[];
  mcpTools: MCPTool[];
  jobs: Job[];
  runs: Run[];
  traceEvents: TraceEvent[];

  isStreaming: boolean;
  streamingContent: string;

  rightPanelTab: 'trace' | 'context' | 'skills' | 'mcp';

  setCurrentWorkspace: (workspace: Workspace | null) => void;
  setCurrentProfile: (profile: AgentProfile | null) => void;
  setCurrentSession: (session: ChatSession | null) => void;
  setCurrentJob: (job: Job | null) => void;
  setCurrentRun: (run: Run | null) => void;

  setWorkspaces: (workspaces: Workspace[]) => void;
  setProfiles: (profiles: AgentProfile[]) => void;
  setSessions: (sessions: ChatSession[]) => void;
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  setSkills: (skills: SkillMetadata[]) => void;
  setMcpServers: (servers: MCPServerConfig[]) => void;
  setMcpTools: (tools: MCPTool[]) => void;
  setJobs: (jobs: Job[]) => void;
  setRuns: (runs: Run[]) => void;
  setTraceEvents: (events: TraceEvent[]) => void;
  addTraceEvent: (event: TraceEvent) => void;

  setIsStreaming: (isStreaming: boolean) => void;
  setStreamingContent: (content: string) => void;
  appendStreamingContent: (content: string) => void;

  setRightPanelTab: (tab: 'trace' | 'context' | 'skills' | 'mcp') => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentWorkspace: null,
  currentProfile: null,
  currentSession: null,
  currentJob: null,
  currentRun: null,

  workspaces: [],
  profiles: [],
  sessions: [],
  messages: [],
  skills: [],
  mcpServers: [],
  mcpTools: [],
  jobs: [],
  runs: [],
  traceEvents: [],

  isStreaming: false,
  streamingContent: '',

  rightPanelTab: 'trace',

  setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),
  setCurrentProfile: (profile) => set({ currentProfile: profile }),
  setCurrentSession: (session) => set({ currentSession: session }),
  setCurrentJob: (job) => set({ currentJob: job }),
  setCurrentRun: (run) => set({ currentRun: run }),

  setWorkspaces: (workspaces) => set({ workspaces }),
  setProfiles: (profiles) => set({ profiles }),
  setSessions: (sessions) => set({ sessions }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setSkills: (skills) => set({ skills }),
  setMcpServers: (servers) => set({ mcpServers: servers }),
  setMcpTools: (tools) => set({ mcpTools: tools }),
  setJobs: (jobs) => set({ jobs }),
  setRuns: (runs) => set({ runs }),
  setTraceEvents: (events) => set({ traceEvents: events }),
  addTraceEvent: (event) => set((state) => ({ traceEvents: [...state.traceEvents, event] })),

  setIsStreaming: (isStreaming) => set({ isStreaming }),
  setStreamingContent: (content) => set({ streamingContent: content }),
  appendStreamingContent: (content) => set((state) => ({ streamingContent: state.streamingContent + content })),

  setRightPanelTab: (tab) => set({ rightPanelTab: tab }),
}));
