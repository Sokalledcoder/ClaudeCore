import { useState } from 'react';
import { Server, Plus, Power, AlertTriangle, Wrench, RefreshCw } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAppStore } from '../../stores/app.store';
import { cn } from '../../lib/utils';
import { AddMCPServerDialog } from '../dialogs/AddMCPServerDialog';

export function MCPPanel() {
  const queryClient = useQueryClient();
  const { mcpServers, mcpTools, currentWorkspace } = useAppStore();
  const [showAddDialog, setShowAddDialog] = useState(false);

  const testServer = useMutation({
    mutationFn: (id: string) => api.mcp.testServer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mcp-servers'] });
    },
  });

  const discoverTools = useMutation({
    mutationFn: (id: string) => api.mcp.discoverTools(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mcp-tools'] });
    },
  });

  if (!currentWorkspace) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center text-muted-foreground">
          <Server className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Select a workspace</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-4 scrollbar-thin">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-medium text-muted-foreground">MCP Servers</h3>
        <button 
          onClick={() => setShowAddDialog(true)}
          className="p-1.5 hover:bg-secondary rounded-md text-muted-foreground"
          title="Add MCP Server"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <AddMCPServerDialog open={showAddDialog} onClose={() => setShowAddDialog(false)} />

      <div className="space-y-2">
        {mcpServers.map((server) => (
          <div
            key={server.id}
            className="p-3 rounded-md bg-secondary/50 hover:bg-secondary"
          >
            <div className="flex items-center gap-2 mb-2">
              <Server className={cn(
                "w-4 h-4",
                server.enabled ? "text-green-400" : "text-muted-foreground"
              )} />
              <span className="text-sm font-medium flex-1">{server.name}</span>
              <span className={cn(
                "text-xs px-1.5 py-0.5 rounded",
                server.lastStatus === 'connected' && "bg-green-500/20 text-green-400",
                server.lastStatus === 'error' && "bg-red-500/20 text-red-400",
                !server.lastStatus && "bg-gray-500/20 text-gray-400"
              )}>
                {server.lastStatus ?? 'unknown'}
              </span>
            </div>
            
            <div className="text-xs text-muted-foreground mb-2">
              <span className="capitalize">{server.transport}</span>
              {server.transport === 'stdio' && server.command && (
                <span className="ml-1">• {server.command}</span>
              )}
              {server.transport === 'http' && server.url && (
                <span className="ml-1">• {server.url}</span>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => testServer.mutate(server.id)}
                className="p-1.5 hover:bg-background rounded text-muted-foreground"
                title="Test connection"
              >
                <Power className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => discoverTools.mutate(server.id)}
                className="p-1.5 hover:bg-background rounded text-muted-foreground"
                title="Discover tools"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {server.lastError && (
              <div className="mt-2 text-xs text-red-400 flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>{server.lastError}</span>
              </div>
            )}
          </div>
        ))}

        {mcpServers.length === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            <Server className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No MCP servers configured</p>
          </div>
        )}
      </div>

      {mcpTools.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-muted-foreground px-1 mb-2">
            Available Tools ({mcpTools.length})
          </h4>
          <div className="space-y-1">
            {mcpTools.slice(0, 10).map((tool) => (
              <div
                key={tool.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-secondary/50"
              >
                <Wrench className={cn(
                  "w-3.5 h-3.5",
                  tool.isHighRisk ? "text-yellow-400" : "text-muted-foreground"
                )} />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-mono truncate block">{tool.fullName}</span>
                </div>
                {tool.isHighRisk && (
                  <span title="High-risk tool">
                    <AlertTriangle className="w-3 h-3 text-yellow-400" />
                  </span>
                )}
              </div>
            ))}
            {mcpTools.length > 10 && (
              <p className="text-xs text-muted-foreground text-center py-1">
                +{mcpTools.length - 10} more tools
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
