import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Send, Sparkles, FileCode, Bot, Server } from 'lucide-react';
import { api, type ChatMessage } from '../../api/client';
import { useAppStore } from '../../stores/app.store';
import { socketClient } from '../../lib/socket';
import { cn } from '../../lib/utils';
import ReactMarkdown from 'react-markdown';

interface StreamingMessage {
  type: 'chunk' | 'tool_call' | 'tool_result' | 'complete' | 'error' | 'trace_event';
  content?: string;
  toolName?: string;
  error?: string;
}

export function ChatPanel() {
  const {
    currentSession,
    currentWorkspace,
    currentProfile,
    messages,
    setMessages,
    addMessage,
    isStreaming,
    setIsStreaming,
    streamingContent,
    setStreamingContent,
    appendStreamingContent,
    addTraceEvent,
  } = useAppStore();

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: sessionMessages } = useQuery({
    queryKey: ['messages', currentSession?.id],
    queryFn: () => currentSession ? api.sessions.getMessages(currentSession.id) : Promise.resolve([]),
    enabled: !!currentSession,
  });

  useEffect(() => {
    if (sessionMessages) {
      setMessages(sessionMessages);
    }
  }, [sessionMessages, setMessages]);

  useEffect(() => {
    if (currentSession) {
      socketClient.joinSession(currentSession.id);

      const handleMessage = (data: unknown) => {
        const message = data as StreamingMessage;
        
        if (message.type === 'chunk' && message.content) {
          appendStreamingContent(message.content);
        } else if (message.type === 'complete') {
          if (streamingContent) {
            const assistantMessage: ChatMessage = {
              id: `msg-${Date.now()}`,
              sessionId: currentSession.id,
              role: 'assistant',
              content: streamingContent,
              createdAt: new Date().toISOString(),
            };
            addMessage(assistantMessage);
          }
          setIsStreaming(false);
          setStreamingContent('');
        } else if (message.type === 'error') {
          console.error('Chat error:', message.error);
          setIsStreaming(false);
          setStreamingContent('');
        } else if (message.type === 'trace_event') {
          const event = (data as { traceEvent?: unknown }).traceEvent;
          if (event) {
            addTraceEvent(event as Parameters<typeof addTraceEvent>[0]);
          }
        }
      };

      socketClient.on('message', handleMessage);

      return () => {
        socketClient.off('message', handleMessage);
        socketClient.leaveSession(currentSession.id);
      };
    }
  }, [currentSession, streamingContent, appendStreamingContent, setIsStreaming, setStreamingContent, addMessage, addTraceEvent]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const handleSend = () => {
    if (!input.trim() || !currentSession || isStreaming) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      sessionId: currentSession.id,
      role: 'user',
      content: input,
      createdAt: new Date().toISOString(),
    };
    addMessage(userMessage);

    setIsStreaming(true);
    setStreamingContent('');
    socketClient.sendMessage(currentSession.id, input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!currentSession) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center text-muted-foreground max-w-md px-4">
          <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
          {!currentWorkspace ? (
            <>
              <p className="text-lg font-medium">Welcome to Agent Control Room</p>
              <p className="text-sm mt-2">
                To get started, create a <strong>Workspace</strong> by clicking the folder icon next to the workspace dropdown.
              </p>
              <p className="text-sm mt-2 text-muted-foreground/70">
                A workspace points to a project directory on your computer.
              </p>
            </>
          ) : (
            <>
              <p className="text-lg font-medium">Create an Agent Profile</p>
              <p className="text-sm mt-2">
                Click the user icon next to the profile dropdown to create an <strong>Agent Profile</strong>.
              </p>
              <p className="text-sm mt-2 text-muted-foreground/70">
                Then click "New Chat" to start chatting with Claude.
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="font-semibold">{currentSession.title}</h2>
          <p className="text-xs text-muted-foreground">
            {currentWorkspace?.name}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {currentProfile && (
            <div className="flex items-center gap-2 text-xs">
              <div className="flex items-center gap-1.5 px-2 py-1 bg-secondary rounded-md">
                <Bot className="w-3.5 h-3.5 text-primary" />
                <span className="font-medium">{currentProfile.name}</span>
                <span className="text-muted-foreground">({currentProfile.model})</span>
              </div>
              {currentProfile.enabledMcpServers.length > 0 && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-green-500/10 text-green-400 rounded-md">
                  <Server className="w-3.5 h-3.5" />
                  <span>{currentProfile.enabledMcpServers.length} MCP</span>
                </div>
              )}
            </div>
          )}
          <button className="p-2 hover:bg-secondary rounded-md text-muted-foreground" title="Create Skill from Chat">
            <FileCode className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex",
              message.role === 'user' ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[80%] rounded-lg px-4 py-2",
                message.role === 'user'
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary"
              )}
            >
              {message.role === 'assistant' ? (
                <div className="prose prose-sm prose-invert max-w-none">
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{message.content}</p>
              )}
            </div>
          </div>
        ))}

        {isStreaming && streamingContent && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg px-4 py-2 bg-secondary">
              <div className="prose prose-sm prose-invert max-w-none">
                <ReactMarkdown>{streamingContent}</ReactMarkdown>
              </div>
              <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />
            </div>
          </div>
        )}

        {isStreaming && !streamingContent && (
          <div className="flex justify-start">
            <div className="bg-secondary rounded-lg px-4 py-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.1s]" />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-border">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="flex-1 bg-secondary rounded-lg px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary min-h-[48px] max-h-[200px]"
            rows={1}
            disabled={isStreaming}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="p-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
