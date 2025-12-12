import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  MessageSquare, 
  FolderPlus, 
  Bot, 
  Plus,
  Settings,
  Briefcase,
  UserPlus
} from 'lucide-react';
import { api } from '../../api/client';
import { useAppStore } from '../../stores/app.store';
import { cn, formatDate, truncate } from '../../lib/utils';
import { CreateWorkspaceDialog } from '../dialogs/CreateWorkspaceDialog';
import { CreateProfileDialog } from '../dialogs/CreateProfileDialog';
import { SettingsDialog } from '../dialogs/SettingsDialog';

export function Sidebar() {
  const queryClient = useQueryClient();
  const { 
    currentWorkspace,
    currentProfile,
    currentSession,
    workspaces,
    profiles,
    sessions,
    jobs,
    setCurrentWorkspace,
    setCurrentProfile,
    setCurrentSession,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<'chats' | 'jobs'>('chats');
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [showCreateProfile, setShowCreateProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const createSession = useMutation({
    mutationFn: api.sessions.create,
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      setCurrentSession(session);
    },
  });

  const handleNewChat = () => {
    if (!currentWorkspace || !currentProfile) return;
    createSession.mutate({
      workspaceId: currentWorkspace.id,
      agentProfileId: currentProfile.id,
      title: 'New Chat',
    });
  };

  return (
    <aside className="w-64 border-r border-border flex flex-col bg-card">
      <div className="p-4 border-b border-border">
        <h1 className="text-lg font-semibold flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          Agent Control Room
        </h1>
      </div>

      <div className="p-3 border-b border-border space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs text-muted-foreground">Workspace</label>
            <button
              onClick={() => setShowCreateWorkspace(true)}
              className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground"
              title="Create workspace"
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </button>
          </div>
          <select
            className="w-full bg-secondary text-foreground rounded-md px-2 py-1.5 text-sm border border-border"
            value={currentWorkspace?.id ?? ''}
            onChange={(e) => {
              const ws = workspaces.find((w: { id: string }) => w.id === e.target.value);
              setCurrentWorkspace(ws ?? null);
            }}
          >
            <option value="">Select workspace...</option>
            {workspaces.map((ws: { id: string; name: string }) => (
              <option key={ws.id} value={ws.id}>{ws.name}</option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs text-muted-foreground">Agent Profile</label>
            <button
              onClick={() => setShowCreateProfile(true)}
              disabled={!currentWorkspace}
              className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground disabled:opacity-50"
              title="Create profile"
            >
              <UserPlus className="w-3.5 h-3.5" />
            </button>
          </div>
          <select
            className="w-full bg-secondary text-foreground rounded-md px-2 py-1.5 text-sm border border-border"
            value={currentProfile?.id ?? ''}
            onChange={(e) => {
              const profile = profiles.find((p: { id: string }) => p.id === e.target.value);
              setCurrentProfile(profile ?? null);
            }}
            disabled={!currentWorkspace}
          >
            <option value="">{currentWorkspace ? 'Select profile...' : 'Select workspace first'}</option>
            {profiles.map((p: { id: string; name: string }) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex border-b border-border">
        <button
          className={cn(
            "flex-1 px-3 py-2 text-sm font-medium flex items-center justify-center gap-1.5",
            activeTab === 'chats' ? "border-b-2 border-primary text-foreground" : "text-muted-foreground"
          )}
          onClick={() => setActiveTab('chats')}
        >
          <MessageSquare className="w-4 h-4" />
          Chats
        </button>
        <button
          className={cn(
            "flex-1 px-3 py-2 text-sm font-medium flex items-center justify-center gap-1.5",
            activeTab === 'jobs' ? "border-b-2 border-primary text-foreground" : "text-muted-foreground"
          )}
          onClick={() => setActiveTab('jobs')}
        >
          <Briefcase className="w-4 h-4" />
          Jobs
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {activeTab === 'chats' && (
          <div className="p-2 space-y-1">
            <button
              onClick={handleNewChat}
              disabled={!currentWorkspace || !currentProfile}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              New Chat
            </button>
            
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => setCurrentSession(session)}
                className={cn(
                  "w-full flex flex-col items-start px-3 py-2 text-sm rounded-md",
                  currentSession?.id === session.id ? "bg-secondary" : "hover:bg-secondary/50"
                )}
              >
                <span className="font-medium">{truncate(session.title, 25)}</span>
                <span className="text-xs text-muted-foreground">{formatDate(session.updatedAt)}</span>
              </button>
            ))}
          </div>
        )}

        {activeTab === 'jobs' && (
          <div className="p-2 space-y-1">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="flex flex-col items-start px-3 py-2 text-sm rounded-md hover:bg-secondary/50"
              >
                <div className="flex items-center gap-2 w-full">
                  <span className="font-medium flex-1">{truncate(job.title, 20)}</span>
                  <span className={cn(
                    "text-xs px-1.5 py-0.5 rounded",
                    job.status === 'success' && "bg-green-500/20 text-green-400",
                    job.status === 'error' && "bg-red-500/20 text-red-400",
                    job.status === 'running' && "bg-blue-500/20 text-blue-400",
                    job.status === 'queued' && "bg-yellow-500/20 text-yellow-400",
                    job.status === 'cancelled' && "bg-gray-500/20 text-gray-400"
                  )}>
                    {job.status}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">{formatDate(job.createdAt)}</span>
              </div>
            ))}
            {jobs.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No jobs yet</p>
            )}
          </div>
        )}
      </div>

      <div className="p-3 border-t border-border">
        <button 
          onClick={() => setShowSettings(true)}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-secondary text-muted-foreground"
        >
          <Settings className="w-4 h-4" />
          Settings
        </button>
      </div>

      <CreateWorkspaceDialog 
        open={showCreateWorkspace} 
        onClose={() => setShowCreateWorkspace(false)} 
      />
      <CreateProfileDialog 
        open={showCreateProfile} 
        onClose={() => setShowCreateProfile(false)} 
      />
      <SettingsDialog 
        open={showSettings} 
        onClose={() => setShowSettings(false)} 
      />
    </aside>
  );
}
