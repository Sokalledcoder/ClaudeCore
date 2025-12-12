import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, FolderPlus, ChevronRight, Home, ArrowUp, Loader2, Check, Plus } from 'lucide-react';
import { api, Workspace } from '../../api/client';
import { useAppStore } from '../../stores/app.store';

interface Props {
  open: boolean;
  onClose: () => void;
  editWorkspace?: Workspace | null;
}

interface DirectoryEntry {
  name: string;
  path: string;
  isDirectory: boolean;
}

export function CreateWorkspaceDialog({ open, onClose, editWorkspace }: Props) {
  const queryClient = useQueryClient();
  const { setCurrentWorkspace } = useAppStore();
  const [name, setName] = useState('');
  const [projectRoot, setProjectRoot] = useState('');
  const [showBrowser, setShowBrowser] = useState(true);
  const [currentPath, setCurrentPath] = useState('');
  const [directories, setDirectories] = useState<DirectoryEntry[]>([]);
  const [quickPaths, setQuickPaths] = useState<Array<{ name: string; path: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);

  const isEditing = !!editWorkspace;

  // Populate form when editing
  useEffect(() => {
    if (editWorkspace) {
      setName(editWorkspace.name);
      setProjectRoot(editWorkspace.projectRoot);
      setShowBrowser(false);
    } else {
      setName('');
      setProjectRoot('');
      setShowBrowser(true);
    }
  }, [editWorkspace]);

  useEffect(() => {
    if (open && !editWorkspace) {
      loadQuickPaths();
      browsePath();
    }
  }, [open, editWorkspace]);

  const loadQuickPaths = async () => {
    try {
      const result = await api.filesystem.quickPaths();
      setQuickPaths(result.quickPaths);
    } catch (e) {
      console.error('Failed to load quick paths:', e);
    }
  };

  const browsePath = async (path?: string) => {
    setLoading(true);
    try {
      const result = await api.filesystem.browse(path);
      setCurrentPath(result.currentPath);
      setDirectories(result.directories);
    } catch (e) {
      console.error('Failed to browse:', e);
    } finally {
      setLoading(false);
    }
  };

  const navigateUp = async () => {
    const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/';
    await browsePath(parentPath);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    try {
      const result = await api.filesystem.createFolder(currentPath, newFolderName.trim());
      setNewFolderName('');
      setShowNewFolderInput(false);
      // Navigate to the new folder
      await browsePath(result.path);
    } catch (e) {
      console.error('Failed to create folder:', e);
    } finally {
      setCreatingFolder(false);
    }
  };

  const selectFolder = (path: string) => {
    setProjectRoot(path);
    // Auto-fill name from folder name if empty
    if (!name) {
      const folderName = path.split('/').pop() || '';
      setName(folderName);
    }
    setShowBrowser(false);
  };

  const createWorkspace = useMutation({
    mutationFn: api.workspaces.create,
    onSuccess: (workspace) => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      setCurrentWorkspace(workspace);
      setName('');
      setProjectRoot('');
      onClose();
    },
  });

  const updateWorkspace = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof api.workspaces.update>[1] }) =>
      api.workspaces.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      setName('');
      setProjectRoot('');
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !projectRoot.trim()) return;
    
    if (isEditing && editWorkspace) {
      updateWorkspace.mutate({ id: editWorkspace.id, data: { name: name.trim(), projectRoot: projectRoot.trim() } });
    } else {
      createWorkspace.mutate({ name: name.trim(), projectRoot: projectRoot.trim() });
    }
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
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <FolderPlus className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{isEditing ? 'Edit Workspace' : 'Create Workspace'}</h2>
            <p className="text-sm text-muted-foreground">{isEditing ? 'Update workspace settings' : 'Select a project folder'}</p>
          </div>
        </div>

        {showBrowser ? (
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Quick access */}
            <div className="flex gap-2 mb-3 flex-wrap">
              {quickPaths.map((qp) => (
                <button
                  key={qp.path}
                  onClick={() => browsePath(qp.path)}
                  className="px-2 py-1 text-xs bg-secondary rounded hover:bg-secondary/80 flex items-center gap-1"
                >
                  <Home className="w-3 h-3" />
                  {qp.name}
                </button>
              ))}
            </div>

            {/* Current path */}
            <div className="flex items-center gap-2 mb-3 p-2 bg-secondary rounded text-sm">
              <button
                onClick={navigateUp}
                disabled={currentPath === '/'}
                className="p-1 hover:bg-background rounded disabled:opacity-50"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
              <span className="font-mono text-xs truncate flex-1">{currentPath}</span>
              <button
                onClick={() => setShowNewFolderInput(!showNewFolderInput)}
                className="px-2 py-1 border border-border rounded text-xs flex items-center gap-1 hover:bg-background"
              >
                <Plus className="w-3 h-3" />
                New Folder
              </button>
              <button
                onClick={() => selectFolder(currentPath)}
                className="px-2 py-1 bg-primary text-primary-foreground rounded text-xs flex items-center gap-1"
              >
                <Check className="w-3 h-3" />
                Select This
              </button>
            </div>

            {/* New folder input */}
            {showNewFolderInput && (
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="New folder name..."
                  className="flex-1 px-3 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateFolder();
                    if (e.key === 'Escape') {
                      setShowNewFolderInput(false);
                      setNewFolderName('');
                    }
                  }}
                />
                <button
                  onClick={handleCreateFolder}
                  disabled={!newFolderName.trim() || creatingFolder}
                  className="px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm disabled:opacity-50"
                >
                  {creatingFolder ? 'Creating...' : 'Create'}
                </button>
                <button
                  onClick={() => {
                    setShowNewFolderInput(false);
                    setNewFolderName('');
                  }}
                  className="px-3 py-2 border border-border rounded-md text-sm hover:bg-secondary"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Directory listing */}
            <div className="flex-1 overflow-y-auto border border-border rounded bg-background">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : directories.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No subdirectories
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {directories.map((dir) => (
                    <div
                      key={dir.path}
                      className="flex items-center hover:bg-secondary cursor-pointer group"
                    >
                      <button
                        onClick={() => browsePath(dir.path)}
                        className="flex-1 flex items-center gap-2 px-3 py-2 text-left"
                      >
                        <FolderPlus className="w-4 h-4 text-primary" />
                        <span className="text-sm">{dir.name}</span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
                      </button>
                      <button
                        onClick={() => selectFolder(dir.path)}
                        className="px-3 py-2 text-xs text-primary opacity-0 group-hover:opacity-100 hover:bg-primary/10"
                      >
                        Select
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Selected Path</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={projectRoot}
                  onChange={(e) => setProjectRoot(e.target.value)}
                  className="flex-1 px-3 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowBrowser(true)}
                  className="px-3 py-2 border border-border rounded-md hover:bg-secondary text-sm"
                >
                  Browse
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Workspace Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Project"
                className="w-full px-3 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus
              />
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
                disabled={!name.trim() || !projectRoot.trim() || createWorkspace.isPending}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
              >
                {createWorkspace.isPending ? 'Creating...' : 'Create Workspace'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
