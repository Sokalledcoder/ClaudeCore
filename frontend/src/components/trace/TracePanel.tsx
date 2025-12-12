import { Clock, Play, Square, Wrench, AlertCircle, Bot } from 'lucide-react';
import { useAppStore } from '../../stores/app.store';
import { cn, formatDate } from '../../lib/utils';

const eventTypeConfig: Record<string, { icon: typeof Clock; color: string; label: string }> = {
  session_start: { icon: Play, color: 'text-green-400', label: 'Session Start' },
  system_init: { icon: Bot, color: 'text-blue-400', label: 'System Init' },
  user_prompt: { icon: Clock, color: 'text-purple-400', label: 'User Prompt' },
  assistant_message: { icon: Bot, color: 'text-blue-400', label: 'Assistant' },
  pre_tool_use: { icon: Wrench, color: 'text-yellow-400', label: 'Tool Call' },
  post_tool_use: { icon: Wrench, color: 'text-green-400', label: 'Tool Result' },
  subagent_start: { icon: Bot, color: 'text-cyan-400', label: 'Subagent Start' },
  subagent_stop: { icon: Bot, color: 'text-cyan-400', label: 'Subagent Stop' },
  stop: { icon: Square, color: 'text-red-400', label: 'Stop' },
  error: { icon: AlertCircle, color: 'text-red-500', label: 'Error' },
  notification: { icon: AlertCircle, color: 'text-orange-400', label: 'Notification' },
};

export function TracePanel() {
  const { traceEvents } = useAppStore();

  if (traceEvents.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center text-muted-foreground">
          <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No trace events yet</p>
          <p className="text-xs mt-1">Start a chat to see agent activity</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
      <h3 className="text-sm font-medium text-muted-foreground px-1 mb-3">
        Timeline ({traceEvents.length} events)
      </h3>
      
      {traceEvents.map((event, index) => {
        const config = eventTypeConfig[event.type] ?? eventTypeConfig.notification;
        const Icon = config.icon;
        
        return (
          <div
            key={event.id}
            className="flex gap-3 p-2 rounded-md hover:bg-secondary/50 group"
          >
            <div className="flex flex-col items-center">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center bg-secondary",
                config.color
              )}>
                <Icon className="w-4 h-4" />
              </div>
              {index < traceEvents.length - 1 && (
                <div className="w-px flex-1 bg-border mt-1" />
              )}
            </div>
            
            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-center justify-between">
                <span className={cn("text-xs font-medium", config.color)}>
                  {config.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDate(event.timestamp)}
                </span>
              </div>
              
              <div className="mt-1 text-xs text-muted-foreground">
                {event.type === 'pre_tool_use' && (
                  <span>Tool: {(event.payload as { tool_name?: string }).tool_name}</span>
                )}
                {event.type === 'post_tool_use' && (
                  <span>Completed: {(event.payload as { tool_name?: string }).tool_name}</span>
                )}
                {event.type === 'user_prompt' && (
                  <span className="line-clamp-2">
                    {(event.payload as { prompt?: string }).prompt?.slice(0, 100)}
                  </span>
                )}
                {event.type === 'error' && (
                  <span className="text-red-400">
                    {(event.payload as { error?: string }).error}
                  </span>
                )}
                {event.type === 'subagent_start' && (
                  <span>Agent: {(event.payload as { agent_name?: string }).agent_name}</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
