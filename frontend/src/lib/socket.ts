import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3001';

class SocketClient {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<(data: unknown) => void>> = new Map();

  connect(): Socket {
    if (!this.socket) {
      this.socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        autoConnect: true,
      });

      this.socket.on('connect', () => {
        console.log('Socket connected:', this.socket?.id);
      });

      this.socket.on('disconnect', () => {
        console.log('Socket disconnected');
      });

      this.socket.on('error', (error) => {
        console.error('Socket error:', error);
      });
    }
    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinSession(sessionId: string): void {
    this.socket?.emit('join-session', sessionId);
  }

  leaveSession(sessionId: string): void {
    this.socket?.emit('leave-session', sessionId);
  }

  joinRun(runId: string): void {
    this.socket?.emit('join-run', runId);
  }

  leaveRun(runId: string): void {
    this.socket?.emit('leave-run', runId);
  }

  sendMessage(sessionId: string, content: string, jobId?: string): void {
    this.socket?.emit('send-message', { sessionId, content, jobId });
  }

  cancelRun(runId: string): void {
    this.socket?.emit('cancel-run', runId);
  }

  on(event: string, callback: (data: unknown) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
      this.socket?.on(event, (data) => {
        this.listeners.get(event)?.forEach((cb) => cb(data));
      });
    }
    this.listeners.get(event)?.add(callback);
  }

  off(event: string, callback: (data: unknown) => void): void {
    this.listeners.get(event)?.delete(callback);
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

export const socketClient = new SocketClient();
