import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, FileCode, FolderOpen, Plus, Upload } from 'lucide-react';
import { api } from '../../api/client';
import { useAppStore } from '../../stores/app.store';
import { cn } from '../../lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
}

type TabType = 'create' | 'import';
type ScopeType = 'project' | 'user';

const DEFAULT_SKILL_TEMPLATE = `---
name: My Skill
description: A brief description of what this skill does
---

# My Skill

## Overview
Describe the purpose and capabilities of this skill.

## Instructions
1. Step one
2. Step two
3. Step three

## Examples
\`\`\`
Example usage or code
\`\`\`
`;

export function AddSkillDialog({ open, onClose }: Props) {
  const queryClient = useQueryClient();
  const { currentWorkspace, setSkills, skills } = useAppStore();
  
  const [tab, setTab] = useState<TabType>('create');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [scope, setScope] = useState<ScopeType>('project');
  const [content, setContent] = useState(DEFAULT_SKILL_TEMPLATE);
  const [importPath, setImportPath] = useState('');
  const [importPaths, setImportPaths] = useState<string[]>([]);

  const createSkill = useMutation({
    mutationFn: api.skills.create,
    onSuccess: (skill) => {
      queryClient.invalidateQueries({ queryKey: ['skills'] });
      setSkills([...skills, skill]);
      resetForm();
      onClose();
    },
  });

  const importSkill = useMutation({
    mutationFn: api.skills.importFromPath,
    onSuccess: (importedSkills) => {
      queryClient.invalidateQueries({ queryKey: ['skills'] });
      setSkills([...skills, ...importedSkills]);
      resetForm();
      onClose();
    },
  });

  const resetForm = () => {
    setName('');
    setDescription('');
    setScope('project');
    setContent(DEFAULT_SKILL_TEMPLATE);
    setImportPath('');
    setImportPaths([]);
    setTab('create');
  };

  const handleAddImportPath = () => {
    if (importPath.trim() && !importPaths.includes(importPath.trim())) {
      setImportPaths([...importPaths, importPath.trim()]);
      setImportPath('');
    }
  };

  const handleRemoveImportPath = (path: string) => {
    setImportPaths(importPaths.filter(p => p !== path));
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !currentWorkspace) return;

    createSkill.mutate({
      workspaceId: currentWorkspace.id,
      name: name.trim(),
      description: description.trim(),
      scope,
      content,
    });
  };

  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (importPaths.length === 0 || !currentWorkspace) return;

    importSkill.mutate({
      workspaceId: currentWorkspace.id,
      paths: importPaths,
      scope,
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-lg w-full max-w-2xl p-6 shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
            <FileCode className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Add Skill</h2>
            <p className="text-sm text-muted-foreground">Create new or import existing skills</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setTab('create')}
            className={cn(
              "flex-1 px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2",
              tab === 'create' ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80"
            )}
          >
            <Plus className="w-4 h-4" />
            Create New
          </button>
          <button
            onClick={() => setTab('import')}
            className={cn(
              "flex-1 px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2",
              tab === 'import' ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80"
            )}
          >
            <Upload className="w-4 h-4" />
            Import Existing
          </button>
        </div>

        {/* Scope selector (shared) */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1.5">Scope</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setScope('project')}
              className={cn(
                "flex-1 px-3 py-2 rounded-md text-sm flex items-center justify-center gap-2 border",
                scope === 'project' ? "border-primary bg-primary/10" : "border-border hover:bg-secondary"
              )}
            >
              <FolderOpen className="w-4 h-4" />
              Project (.claude/skills/)
            </button>
            <button
              type="button"
              onClick={() => setScope('user')}
              className={cn(
                "flex-1 px-3 py-2 rounded-md text-sm flex items-center justify-center gap-2 border",
                scope === 'user' ? "border-primary bg-primary/10" : "border-border hover:bg-secondary"
              )}
            >
              <FileCode className="w-4 h-4" />
              User (~/.claude/skills/)
            </button>
          </div>
        </div>

        {tab === 'create' ? (
          <form onSubmit={handleCreateSubmit} className="flex-1 flex flex-col overflow-hidden">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Skill Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., code-reviewer"
                  className="w-full px-3 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What does this skill do?"
                  className="w-full px-3 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0">
              <label className="block text-sm font-medium mb-1.5">SKILL.md Content</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="flex-1 px-3 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm resize-none min-h-[200px]"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-border rounded-md hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!name.trim() || createSkill.isPending}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
              >
                {createSkill.isPending ? 'Creating...' : 'Create Skill'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleImportSubmit} className="flex-1 flex flex-col">
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1.5">
                Import paths (folders containing SKILL.md)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={importPath}
                  onChange={(e) => setImportPath(e.target.value)}
                  placeholder="/path/to/existing/skill or ~/.claude/skills/my-skill"
                  className="flex-1 px-3 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddImportPath();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddImportPath}
                  className="px-3 py-2 bg-secondary rounded-md hover:bg-secondary/80"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Enter full paths to skill folders from other Claude sessions
              </p>
            </div>

            {importPaths.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1.5">Paths to import:</label>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {importPaths.map((path) => (
                    <div
                      key={path}
                      className="flex items-center gap-2 px-2 py-1.5 bg-secondary rounded text-sm font-mono"
                    >
                      <FolderOpen className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="flex-1 truncate">{path}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveImportPath(path)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex-1" />

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-border rounded-md hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={importPaths.length === 0 || importSkill.isPending}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
              >
                {importSkill.isPending ? 'Importing...' : `Import ${importPaths.length} Skill(s)`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
