import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from './api/client';
import { useAppStore } from './stores/app.store';
import { socketClient } from './lib/socket';
import { Sidebar } from './components/layout/Sidebar';
import { ChatPanel } from './components/chat/ChatPanel';
import { RightPanel } from './components/layout/RightPanel';

function App() {
  const { 
    currentWorkspace, 
    setWorkspaces, 
    setCurrentWorkspace,
    setProfiles,
    setSessions,
    setSkills,
    setMcpServers,
    setMcpTools,
    setJobs,
  } = useAppStore();

  const { data: workspaces } = useQuery({
    queryKey: ['workspaces'],
    queryFn: api.workspaces.list,
  });

  useEffect(() => {
    if (workspaces) {
      setWorkspaces(workspaces);
      if (workspaces.length > 0 && !currentWorkspace) {
        setCurrentWorkspace(workspaces[0]);
      }
    }
  }, [workspaces, currentWorkspace, setWorkspaces, setCurrentWorkspace]);

  const { data: profiles } = useQuery({
    queryKey: ['profiles', currentWorkspace?.id],
    queryFn: () => currentWorkspace ? api.profiles.list(currentWorkspace.id) : Promise.resolve([]),
    enabled: !!currentWorkspace,
  });

  const { data: sessions } = useQuery({
    queryKey: ['sessions', currentWorkspace?.id],
    queryFn: () => currentWorkspace ? api.sessions.list(currentWorkspace.id) : Promise.resolve([]),
    enabled: !!currentWorkspace,
  });

  const { data: skills } = useQuery({
    queryKey: ['skills', currentWorkspace?.id],
    queryFn: () => currentWorkspace ? api.skills.list(currentWorkspace.id) : Promise.resolve([]),
    enabled: !!currentWorkspace,
  });

  const { data: mcpServers } = useQuery({
    queryKey: ['mcp-servers', currentWorkspace?.id],
    queryFn: () => currentWorkspace ? api.mcp.listServers(currentWorkspace.id) : Promise.resolve([]),
    enabled: !!currentWorkspace,
  });

  const { data: mcpTools } = useQuery({
    queryKey: ['mcp-tools', currentWorkspace?.id],
    queryFn: () => currentWorkspace ? api.mcp.listTools(currentWorkspace.id) : Promise.resolve([]),
    enabled: !!currentWorkspace,
  });

  const { data: jobs } = useQuery({
    queryKey: ['jobs', currentWorkspace?.id],
    queryFn: () => currentWorkspace ? api.jobs.list(currentWorkspace.id) : Promise.resolve([]),
    enabled: !!currentWorkspace,
  });

  useEffect(() => {
    if (profiles) setProfiles(profiles);
  }, [profiles, setProfiles]);

  useEffect(() => {
    if (sessions) setSessions(sessions);
  }, [sessions, setSessions]);

  useEffect(() => {
    if (skills) setSkills(skills);
  }, [skills, setSkills]);

  useEffect(() => {
    if (mcpServers) setMcpServers(mcpServers);
  }, [mcpServers, setMcpServers]);

  useEffect(() => {
    if (mcpTools) setMcpTools(mcpTools);
  }, [mcpTools, setMcpTools]);

  useEffect(() => {
    if (jobs) setJobs(jobs);
  }, [jobs, setJobs]);

  useEffect(() => {
    socketClient.connect();
    return () => {
      socketClient.disconnect();
    };
  }, []);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 flex overflow-hidden">
        <ChatPanel />
        <RightPanel />
      </main>
    </div>
  );
}

export default App;
