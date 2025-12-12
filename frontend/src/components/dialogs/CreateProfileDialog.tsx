import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Bot, Info } from 'lucide-react';
import { api } from '../../api/client';
import { useAppStore } from '../../stores/app.store';

interface Props {
  open: boolean;
  onClose: () => void;
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

export function CreateProfileDialog({ open, onClose }: Props) {
  const queryClient = useQueryClient();
  const { currentWorkspace, setCurrentProfile } = useAppStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [model, setModel] = useState('claude-sonnet-4-5-20250929');
  const [selectedPreset, setSelectedPreset] = useState('claude_code');
  const [systemPrompt, setSystemPrompt] = useState(PROMPT_PRESETS[0].defaultPrompt);

  useEffect(() => {
    const preset = PROMPT_PRESETS.find(p => p.id === selectedPreset);
    if (preset) {
      setSystemPrompt(preset.defaultPrompt);
    }
  }, [selectedPreset]);

  const createProfile = useMutation({
    mutationFn: api.profiles.create,
    onSuccess: (profile) => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      setCurrentProfile(profile);
      setName('');
      setDescription('');
      setSystemPrompt(PROMPT_PRESETS[0].defaultPrompt);
      setSelectedPreset('claude_code');
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !currentWorkspace) return;
    
    createProfile.mutate({
      workspaceId: currentWorkspace.id,
      name: name.trim(),
      description: description.trim(),
      model,
      systemPrompt: systemPrompt.trim() || null,
    });
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
            <h2 className="text-lg font-semibold">Create Agent Profile</h2>
            <p className="text-sm text-muted-foreground">Configure model and behavior</p>
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
              rows={8}
              className="w-full px-3 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm font-mono"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Edit freely. This prompt defines how the agent behaves.
            </p>
          </div>

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
              disabled={!name.trim() || !currentWorkspace || createProfile.isPending}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              {createProfile.isPending ? 'Creating...' : 'Create Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
