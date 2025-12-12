import { Activity, FileCode, Server, Layers } from 'lucide-react';
import { useAppStore } from '../../stores/app.store';
import { cn } from '../../lib/utils';
import { TracePanel } from '../trace/TracePanel';
import { ContextPanel } from '../context/ContextPanel';
import { SkillsPanel } from '../skills/SkillsPanel';
import { MCPPanel } from '../mcp/MCPPanel';

export function RightPanel() {
  const { rightPanelTab, setRightPanelTab } = useAppStore();

  const tabs = [
    { id: 'trace' as const, label: 'Trace', icon: Activity },
    { id: 'context' as const, label: 'Context', icon: Layers },
    { id: 'skills' as const, label: 'Skills', icon: FileCode },
    { id: 'mcp' as const, label: 'MCP', icon: Server },
  ];

  return (
    <aside className="w-80 border-l border-border flex flex-col bg-card">
      <div className="flex border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setRightPanelTab(tab.id)}
            className={cn(
              "flex-1 px-2 py-2.5 text-xs font-medium flex flex-col items-center gap-1",
              rightPanelTab === tab.id
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden">
        {rightPanelTab === 'trace' && <TracePanel />}
        {rightPanelTab === 'context' && <ContextPanel />}
        {rightPanelTab === 'skills' && <SkillsPanel />}
        {rightPanelTab === 'mcp' && <MCPPanel />}
      </div>
    </aside>
  );
}
