import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  MessageSquare, 
  FolderPlus, 
  Bot, 
  Plus,
  Settings,
  Briefcase,
  UserPlus,
  Pencil,
  Trash2,
  X
} from 'lucide-react';
import { api, ChatSession } from '../../api/client';
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
  const [editingSession, setEditingSession] = useState<string | null>(null);
  const [editingSessionTitle, setEditingSessionTitle] = useState('');

  const createSession = useMutation({
    mutationFn: api.sessions.create,
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      setCurrentSession(session);
    },
  });

  const updateSession = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { title?: string } }) => 
      api.sessions.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      setEditingSession(null);
    },
  });

  const deleteSession = useMutation({
    mutationFn: api.sessions.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      if (currentSession && sessions.find((s: ChatSession) => s.id === currentSession.id) === undefined) {
        setCurrentSession(null);
      }
    },
  });

  const deleteProfile = useMutation({
    mutationFn: api.profiles.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      if (currentProfile) {
        setCurrentProfile(null);
      }
    },
  });

  const deleteWorkspace = useMutation({
    mutationFn: api.workspaces.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      setCurrentWorkspace(null);
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
            <div className="flex items-center gap-0.5">
              {currentWorkspace && (
                <button
                  onClick={() => {
                    if (confirm(`Delete workspace "${currentWorkspace.name}"? This will delete all associated data.`)) {
                      deleteWorkspace.mutate(currentWorkspace.id);
                    }
                  }}
                  className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-red-400"
                  title="Delete workspace"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => setShowCreateWorkspace(true)}
                className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground"
                title="Create workspace"
              >
                <FolderPlus className="w-3.5 h-3.5" />
              </button>
            </div>
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
            <div className="flex items-center gap-0.5">
              {currentProfile && (
                <button
                  onClick={() => {
                    if (confirm(`Delete profile "${currentProfile.name}"?`)) {
                      deleteProfile.mutate(currentProfile.id);
                    }
                  }}
                  className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-red-400"
                  title="Delete profile"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => setShowCreateProfile(true)}
                disabled={!currentWorkspace}
                className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground disabled:opacity-50"
                title="Create profile"
              >
                <UserPlus className="w-3.5 h-3.5" />
              </button>
            </div>
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
            
            {sessions.map((session: ChatSession) => (
              <div
                key={session.id}
                className={cn(
                  "group relative flex items-center rounded-md",
                  currentSession?.id === session.id ? "bg-secondary" : "hover:bg-secondary/50"
                )}
              >
                {editingSession === session.id ? (
                  <div className="flex-1 flex items-center gap-1 px-2 py-1">
                    <input
                      type="text"
                      value={editingSessionTitle}
                      onChange={(e) => setEditingSessionTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          updateSession.mutate({ id: session.id, data: { title: editingSessionTitle } });
                        } else if (e.key === 'Escape') {
                          setEditingSession(null);
                        }
                      }}
                      className="flex-1 bg-background border border-border rounded px-2 py-1 text-sm"
                      autoFocus
                    />
                    <button
                      onClick={() => setEditingSession(null)}
                      className="p-1 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => setCurrentSession(session)}
                      className="flex-1 flex flex-col items-start px-3 py-2 text-sm"
                    >
                      <span className="font-medium">{truncate(session.title, 20)}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(session.updatedAt)}</span>
                    </button>
                    <div className="hidden group-hover:flex items-center gap-0.5 pr-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingSession(session.id);
                          setEditingSessionTitle(session.title);
                        }}
                        className="p-1 text-muted-foreground hover:text-foreground rounded"
                        title="Rename"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete chat "${session.title}"?`)) {
                            deleteSession.mutate(session.id);
                          }
                        }}
                        className="p-1 text-muted-foreground hover:text-red-400 rounded"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </>
                )}
              </div>
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
