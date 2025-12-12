import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Bot, Info, Server } from 'lucide-react';
import { api, AgentProfile } from '../../api/client';
import { useAppStore } from '../../stores/app.store';

interface Props {
  open: boolean;
  onClose: () => void;
  editProfile?: AgentProfile | null;
}

const CLAUDE_MODELS = [
  { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5', description: 'Best for agents and coding (recommended)' },
  { id: 'claude-sonnet-4-5-20250929-1m', name: 'Claude Sonnet 4.5 (1M context)', description: 'Extended 1 million token context window' },
  { id: 'claude-opus-4-5-20251101', name: 'Claude Opus 4.5', description: 'Most capable model, maximum intelligence' },
  { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', description: 'Fast hybrid with extended thinking' },
];

const PROMPT_PRESETS = [
  { 
    id: 'claude_code', 
    name: 'Claude Code (Default)', 
    description: 'Expert software engineer with file/bash access',
    defaultPrompt: `You are Claude Code, an expert software engineer with deep knowledge of programming, system design, and development best practices. You have access to tools for reading/writing files, executing bash commands, and searching codebases. Always verify your work and prefer minimal, focused changes.`
  },
  { 
    id: 'assistant', 
    name: 'General Assistant', 
    description: 'Helpful AI for general conversation',
    defaultPrompt: `You are a helpful, harmless, and honest AI assistant. Provide clear, accurate, and thoughtful responses. Be direct and concise while remaining friendly and supportive.`
  },
  { 
    id: 'custom', 
    name: 'Start from Scratch', 
    description: 'Write your own system prompt',
    defaultPrompt: ``
  },
];

export function CreateProfileDialog({ open, onClose, editProfile }: Props) {
  const queryClient = useQueryClient();
  const { currentWorkspace, setCurrentProfile, mcpServers } = useAppStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [model, setModel] = useState('claude-sonnet-4-5-20250929');
  const [selectedPreset, setSelectedPreset] = useState('claude_code');
  const [systemPrompt, setSystemPrompt] = useState(PROMPT_PRESETS[0].defaultPrompt);
  const [enabledMcpServers, setEnabledMcpServers] = useState<string[]>([]);

  const isEditing = !!editProfile;

  // Populate form when editing
  useEffect(() => {
    if (editProfile) {
      setName(editProfile.name);
      setDescription(editProfile.description || '');
      setModel(editProfile.model);
      setSystemPrompt(editProfile.customSystemPromptAppend || '');
      setEnabledMcpServers(editProfile.enabledMcpServers || []);
      setSelectedPreset('custom');
    } else {
      resetForm();
    }
  }, [editProfile]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setModel('claude-sonnet-4-5-20250929');
    setSelectedPreset('claude_code');
    setSystemPrompt(PROMPT_PRESETS[0].defaultPrompt);
    setEnabledMcpServers([]);
  };

  useEffect(() => {
    if (!editProfile) {
      const preset = PROMPT_PRESETS.find(p => p.id === selectedPreset);
      if (preset) {
        setSystemPrompt(preset.defaultPrompt);
      }
    }
  }, [selectedPreset, editProfile]);

  const createProfile = useMutation({
    mutationFn: api.profiles.create,
    onSuccess: (profile) => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      setCurrentProfile(profile);
      resetForm();
      onClose();
    },
  });

  const updateProfile = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof api.profiles.update>[1] }) =>
      api.profiles.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      resetForm();
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !currentWorkspace) return;
    
    const profileData = {
      workspaceId: currentWorkspace.id,
      name: name.trim(),
      description: description.trim(),
      model,
      systemPrompt: systemPrompt.trim() || null,
      enabledMcpServers,
    };

    if (isEditing && editProfile) {
      updateProfile.mutate({ id: editProfile.id, data: profileData });
    } else {
      createProfile.mutate(profileData);
    }
  };

  const toggleMcpServer = (serverName: string) => {
    setEnabledMcpServers(prev => 
      prev.includes(serverName) 
        ? prev.filter(n => n !== serverName)
        : [...prev, serverName]
    );
  };

  if (!open) return null;

  const selectedModel = CLAUDE_MODELS.find(m => m.id === model);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-lg w-full max-w-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{isEditing ? 'Edit Agent Profile' : 'Create Agent Profile'}</h2>
            <p className="text-sm text-muted-foreground">{isEditing ? 'Update profile settings' : 'Configure model and behavior'}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Profile Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Coding Assistant"
                className="w-full px-3 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Description (optional)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this profile for?"
                className="w-full px-3 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Model</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {CLAUDE_MODELS.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            {selectedModel && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Info className="w-3 h-3" />
                {selectedModel.description}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Start from preset</label>
            <div className="flex gap-2 flex-wrap">
              {PROMPT_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setSelectedPreset(preset.id)}
                  className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                    selectedPreset === preset.id 
                      ? 'border-primary bg-primary/10 text-primary' 
                      : 'border-border hover:bg-secondary'
                  }`}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">System Prompt</label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Define the agent's role, personality, and instructions..."
              rows={6}
              className="w-full px-3 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm font-mono"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Edit freely. This prompt defines how the agent behaves.
            </p>
          </div>

          {mcpServers.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-1.5 flex items-center gap-2">
                <Server className="w-4 h-4" />
                MCP Servers
              </label>
              <p className="text-xs text-muted-foreground mb-2">
                Select which MCP servers this profile can use
              </p>
              <div className="space-y-2 max-h-32 overflow-y-auto border border-border rounded-md p-2">
                {mcpServers.map((server) => (
                  <label key={server.id} className="flex items-center gap-2 cursor-pointer hover:bg-secondary/50 p-1 rounded">
                    <input
                      type="checkbox"
                      checked={enabledMcpServers.includes(server.name)}
                      onChange={() => toggleMcpServer(server.name)}
                      className="rounded border-border"
                    />
                    <span className="text-sm">{server.name}</span>
                    <span className="text-xs text-muted-foreground">({server.transport})</span>
                    {server.lastStatus === 'connected' && (
                      <span className="text-xs text-green-400">●</span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-border rounded-md hover:bg-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || !currentWorkspace || createProfile.isPending || updateProfile.isPending}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              {createProfile.isPending || updateProfile.isPending 
                ? (isEditing ? 'Saving...' : 'Creating...') 
                : (isEditing ? 'Save Changes' : 'Create Profile')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
