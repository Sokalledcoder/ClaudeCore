import { Layers, History, FileText, Wrench, StickyNote } from 'lucide-react';
import { useAppStore } from '../../stores/app.store';
import { cn } from '../../lib/utils';

interface ContextSliceCardProps {
  title: string;
  icon: typeof Layers;
  summary: string;
  tokens: number;
  color: string;
}

function ContextSliceCard({ title, icon: Icon, summary, tokens, color }: ContextSliceCardProps) {
  return (
    <div className="p-3 rounded-md bg-secondary/50 hover:bg-secondary">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn("w-4 h-4", color)} />
        <span className="text-sm font-medium">{title}</span>
        <span className="text-xs text-muted-foreground ml-auto">~{tokens} tokens</span>
      </div>
      <p className="text-xs text-muted-foreground">{summary}</p>
    </div>
  );
}

export function ContextPanel() {
  const { messages, skills, mcpTools } = useAppStore();

  const historyTokens = Math.ceil(messages.reduce((sum, m) => sum + m.content.length, 0) / 4);
  const skillsTokens = skills.length * 50;
  const mcpTokens = mcpTools.length * 30;

  const slices = [
    {
      title: 'Conversation History',
      icon: History,
      summary: `${messages.length} messages in current session`,
      tokens: historyTokens,
      color: 'text-blue-400',
    },
    {
      title: 'Skills',
      icon: FileText,
      summary: `${skills.length} skills available`,
      tokens: skillsTokens,
      color: 'text-purple-400',
    },
    {
      title: 'MCP Tools',
      icon: Wrench,
      summary: `${mcpTools.length} tools from MCP servers`,
      tokens: mcpTokens,
      color: 'text-green-400',
    },
    {
      title: 'Scratchpad',
      icon: StickyNote,
      summary: 'Working notes and summaries',
      tokens: 0,
      color: 'text-yellow-400',
    },
  ];

  const totalTokens = slices.reduce((sum, s) => sum + s.tokens, 0);

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-medium text-muted-foreground">Context Slices</h3>
        <span className="text-xs text-muted-foreground">
          ~{totalTokens.toLocaleString()} tokens total
        </span>
      </div>

      <div className="space-y-2">
        {slices.map((slice) => (
          <ContextSliceCard key={slice.title} {...slice} />
        ))}
      </div>

      <div className="pt-3 border-t border-border">
        <h4 className="text-xs font-medium text-muted-foreground mb-2 px-1">Actions</h4>
        <div className="space-y-1">
          <button className="w-full text-left px-3 py-2 text-xs rounded-md hover:bg-secondary">
            Clear conversation history
          </button>
          <button className="w-full text-left px-3 py-2 text-xs rounded-md hover:bg-secondary">
            Pin item to scratchpad
          </button>
          <button className="w-full text-left px-3 py-2 text-xs rounded-md hover:bg-secondary">
            Summarize context
          </button>
        </div>
      </div>
    </div>
  );
}
