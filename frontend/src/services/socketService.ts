/// <reference types="vite/client" />
// SEWA XAI — frontend/src/services/socketService.ts
import { io as socketIO, Socket } from 'socket.io-client';

const isProd = typeof window !== 'undefined' && window.location.hostname.includes('sewaxai.health');
const BASE = isProd 
  ? 'https://api.sewaxai.health' 
  : (import.meta.env.VITE_API_URL?.replace('/v1','') ?? 'https://api.sewaxai.health');


class SocketService {
  private socket: Socket | null = null;

  connect(token: string, tenantId: string) {
    if (this.socket?.connected) return;
    this.socket = socketIO(BASE, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000,
    });
    this.socket.on('connect', () => console.log('[Socket] Connected'));
    this.socket.on('disconnect', () => console.log('[Socket] Disconnected'));
  }

  on(event: string, handler: (...args: any[]) => void) {
    this.socket?.on(event, handler);
  }

  off(event: string) { this.socket?.off(event); }
  disconnect() { this.socket?.disconnect(); this.socket = null; }
}

export const socketService = new SocketService();
