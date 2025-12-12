import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Server, Globe, Terminal, Radio } from 'lucide-react';
import { api } from '../../api/client';
import { useAppStore } from '../../stores/app.store';
import { cn } from '../../lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
}

type TransportType = 'stdio' | 'http' | 'sse';

const TRANSPORT_OPTIONS: { value: TransportType; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'stdio', label: 'Stdio', icon: <Terminal className="w-4 h-4" />, description: 'Local process (command + args)' },
  { value: 'http', label: 'HTTP', icon: <Globe className="w-4 h-4" />, description: 'Remote HTTP endpoint' },
  { value: 'sse', label: 'SSE', icon: <Radio className="w-4 h-4" />, description: 'Server-Sent Events stream' },
];

const PRESET_SERVERS = [
  { name: 'Filesystem', transport: 'stdio' as TransportType, command: 'npx', args: '-y @modelcontextprotocol/server-filesystem /' },
  { name: 'GitHub', transport: 'stdio' as TransportType, command: 'npx', args: '-y @modelcontextprotocol/server-github' },
  { name: 'Fetch', transport: 'stdio' as TransportType, command: 'npx', args: '-y @anthropic-ai/mcp-server-fetch' },
  { name: 'Memory', transport: 'stdio' as TransportType, command: 'npx', args: '-y @modelcontextprotocol/server-memory' },
  { name: 'Puppeteer', transport: 'stdio' as TransportType, command: 'npx', args: '-y @anthropic-ai/mcp-server-puppeteer' },
];

export function AddMCPServerDialog({ open, onClose }: Props) {
  const queryClient = useQueryClient();
  const { currentWorkspace, setMcpServers, mcpServers } = useAppStore();
  
  const [name, setName] = useState('');
  const [transport, setTransport] = useState<TransportType>('stdio');
  const [command, setCommand] = useState('');
  const [args, setArgs] = useState('');
  const [url, setUrl] = useState('');
  const [headers, setHeaders] = useState('');
  const [showPresets, setShowPresets] = useState(true);

  const createServer = useMutation({
    mutationFn: api.mcp.createServer,
    onSuccess: (server) => {
      queryClient.invalidateQueries({ queryKey: ['mcp-servers'] });
      setMcpServers([...mcpServers, server]);
      resetForm();
      onClose();
    },
  });

  const resetForm = () => {
    setName('');
    setTransport('stdio');
    setCommand('');
    setArgs('');
    setUrl('');
    setHeaders('');
    setShowPresets(true);
  };

  const handlePresetSelect = (preset: typeof PRESET_SERVERS[0]) => {
    setName(preset.name);
    setTransport(preset.transport);
    setCommand(preset.command);
    setArgs(preset.args);
    setShowPresets(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !currentWorkspace) return;

    const serverData: Parameters<typeof api.mcp.createServer>[0] = {
      workspaceId: currentWorkspace.id,
      name: name.trim(),
      transport,
      enabled: true,
    };

    if (transport === 'stdio') {
      serverData.command = command.trim();
      serverData.args = args.trim().split(/\s+/).filter(Boolean);
    } else {
      serverData.url = url.trim();
      if (headers.trim()) {
        try {
          serverData.headers = JSON.parse(headers.trim());
        } catch {
          // Invalid JSON, ignore headers
        }
      }
    }

    createServer.mutate(serverData);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-lg w-full max-w-lg p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
            <Server className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Add MCP Server</h2>
            <p className="text-sm text-muted-foreground">Connect to an MCP server</p>
          </div>
        </div>

        {showPresets ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Quick presets:</p>
            <div className="grid grid-cols-2 gap-2">
              {PRESET_SERVERS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => handlePresetSelect(preset)}
                  className="p-3 border border-border rounded-lg hover:bg-secondary text-left"
                >
                  <span className="font-medium text-sm">{preset.name}</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">{preset.transport}</span>
                </button>
              ))}
            </div>
            <div className="text-center">
              <button
                onClick={() => setShowPresets(false)}
                className="text-sm text-primary hover:underline"
              >
                Or configure manually →
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Server Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., filesystem, github"
                className="w-full px-3 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Transport</label>
              <div className="grid grid-cols-3 gap-2">
                {TRANSPORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTransport(opt.value)}
                    className={cn(
                      "p-2 border rounded-md text-center",
                      transport === opt.value
                        ? "border-primary bg-primary/10"
                        : "border-border hover:bg-secondary"
                    )}
                  >
                    <div className="flex justify-center mb-1">{opt.icon}</div>
                    <span className="text-xs font-medium">{opt.label}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {TRANSPORT_OPTIONS.find(o => o.value === transport)?.description}
              </p>
            </div>

            {transport === 'stdio' ? (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Command</label>
                  <input
                    type="text"
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                    placeholder="e.g., npx, node, python"
                    className="w-full px-3 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Arguments</label>
                  <input
                    type="text"
                    value={args}
                    onChange={(e) => setArgs(e.target.value)}
                    placeholder="e.g., -y @modelcontextprotocol/server-filesystem /"
                    className="w-full px-3 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1.5">URL</label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://api.example.com/mcp"
                    className="w-full px-3 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Headers (JSON, optional)</label>
                  <textarea
                    value={headers}
                    onChange={(e) => setHeaders(e.target.value)}
                    placeholder='{"Authorization": "Bearer ..."}'
                    rows={2}
                    className="w-full px-3 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm resize-none"
                  />
                </div>
              </>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowPresets(true)}
                className="px-4 py-2 border border-border rounded-md hover:bg-secondary text-sm"
              >
                ← Presets
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-border rounded-md hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!name.trim() || createServer.isPending}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
              >
                {createServer.isPending ? 'Adding...' : 'Add Server'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
