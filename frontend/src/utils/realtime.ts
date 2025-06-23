import { ratingCache } from './cache';

interface RealtimeConfig {
  baseUrl?: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  enableCache?: boolean;
}

interface RealtimeMessage {
  type: 'rating_update' | 'restaurant_update' | 'system_update' | 'heartbeat';
  payload: any;
  timestamp: number;
  version?: string;
}

interface RatingUpdatePayload {
  restaurantId: string;
  platform: string;
  newRating: number;
  reviewCount: number;
  comprehensiveRating?: any;
}

interface RestaurantUpdatePayload {
  restaurantId: string;
  field: string;
  value: any;
}

export class RealtimeManager {
  private ws: WebSocket | null = null;
  private config: Required<RealtimeConfig>;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private listeners = new Map<string, Set<Function>>();
  private isConnecting = false;
  private connectionState: 'connecting' | 'connected' | 'disconnected' | 'error' = 'disconnected';
  private lastHeartbeat = 0;

  constructor(config: RealtimeConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl || 'ws://localhost:3001/ws',
      reconnectInterval: config.reconnectInterval || 5000,
      maxReconnectAttempts: config.maxReconnectAttempts || 10,
      heartbeatInterval: config.heartbeatInterval || 30000,
      enableCache: config.enableCache !== false,
    };
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        reject(new Error('Connection already in progress'));
        return;
      }

      this.isConnecting = true;
      this.connectionState = 'connecting';
      this.emit('connection_state_change', this.connectionState);

      try {
        this.ws = new WebSocket(this.config.baseUrl);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.isConnecting = false;
          this.connectionState = 'connected';
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.emit('connection_state_change', this.connectionState);
          this.emit('connected', null);
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: RealtimeMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          this.isConnecting = false;
          this.connectionState = 'disconnected';
          this.stopHeartbeat();
          this.emit('connection_state_change', this.connectionState);
          this.emit('disconnected', { code: event.code, reason: event.reason });
          
          if (event.code !== 1000) { // 正常終了以外の場合は再接続
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.isConnecting = false;
          this.connectionState = 'error';
          this.emit('connection_state_change', this.connectionState);
          this.emit('error', error);
          reject(error);
        };

      } catch (error) {
        this.isConnecting = false;
        this.connectionState = 'error';
        this.emit('connection_state_change', this.connectionState);
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.connectionState = 'disconnected';
    this.emit('connection_state_change', this.connectionState);
  }

  // イベントリスナーの登録
  on(event: string, listener: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  // イベントリスナーの削除
  off(event: string, listener: Function): void {
    this.listeners.get(event)?.delete(listener);
  }

  // メッセージ送信
  send(type: string, payload: any): boolean {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const message: RealtimeMessage = {
        type: type as any,
        payload,
        timestamp: Date.now(),
      };
      
      this.ws.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  // 接続状態の取得
  getConnectionState(): string {
    return this.connectionState;
  }

  // 接続状態の確認
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private handleMessage(message: RealtimeMessage): void {
    switch (message.type) {
      case 'rating_update':
        this.handleRatingUpdate(message.payload as RatingUpdatePayload);
        break;
      case 'restaurant_update':
        this.handleRestaurantUpdate(message.payload as RestaurantUpdatePayload);
        break;
      case 'heartbeat':
        this.lastHeartbeat = Date.now();
        break;
      case 'system_update':
        this.handleSystemUpdate(message.payload);
        break;
    }

    // 全てのメッセージをリスナーに通知
    this.emit('message', message);
    this.emit(message.type, message.payload);
  }

  private handleRatingUpdate(payload: RatingUpdatePayload): void {
    console.log('Rating update received:', payload);

    if (this.config.enableCache) {
      // プラットフォーム別評価を更新
      ratingCache.setPlatformRating(
        payload.restaurantId,
        payload.platform,
        {
          rating: payload.newRating,
          reviewCount: payload.reviewCount,
          lastUpdated: new Date().toISOString(),
        }
      );

      // 総合評価が含まれている場合は更新
      if (payload.comprehensiveRating) {
        ratingCache.setComprehensiveRating(
          payload.restaurantId,
          payload.comprehensiveRating
        );
      }

      // 検索結果キャッシュを無効化（評価が変わったため）
      ratingCache.invalidateSearchCache();
    }

    this.emit('rating_updated', payload);
  }

  private handleRestaurantUpdate(payload: RestaurantUpdatePayload): void {
    console.log('Restaurant update received:', payload);

    if (this.config.enableCache) {
      // レストラン情報のキャッシュを無効化
      ratingCache.invalidateRestaurant(payload.restaurantId);
    }

    this.emit('restaurant_updated', payload);
  }

  private handleSystemUpdate(payload: any): void {
    console.log('System update received:', payload);
    this.emit('system_updated', payload);
  }

  private emit(event: string, data: any): void {
    this.listeners.get(event)?.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      this.emit('max_reconnect_attempts_reached', null);
      return;
    }

    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts),
      30000
    );

    console.log(`Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect().catch(error => {
        console.error('Reconnection failed:', error);
      });
    }, delay);
  }

  private startHeartbeat(): void {
    this.lastHeartbeat = Date.now();
    
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        this.send('heartbeat', { timestamp: Date.now() });
        
        // ハートビートの応答をチェック
        if (Date.now() - this.lastHeartbeat > this.config.heartbeatInterval * 2) {
          console.log('Heartbeat timeout, reconnecting...');
          this.disconnect();
          this.scheduleReconnect();
        }
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}

// シングルトンインスタンス
export const realtimeManager = new RealtimeManager();

// React Hook
import { useState, useEffect } from 'react';

export const useRealtime = () => {
  const [connectionState, setConnectionState] = useState(realtimeManager.getConnectionState());
  const [lastUpdate, setLastUpdate] = useState<RealtimeMessage | null>(null);

  useEffect(() => {
    const handleConnectionStateChange = (state: string) => {
      setConnectionState(state);
    };

    const handleMessage = (message: RealtimeMessage) => {
      setLastUpdate(message);
    };

    realtimeManager.on('connection_state_change', handleConnectionStateChange);
    realtimeManager.on('message', handleMessage);

    // 初回接続試行
    if (!realtimeManager.isConnected()) {
      realtimeManager.connect().catch(console.error);
    }

    return () => {
      realtimeManager.off('connection_state_change', handleConnectionStateChange);
      realtimeManager.off('message', handleMessage);
    };
  }, []);

  const connect = () => realtimeManager.connect();
  const disconnect = () => realtimeManager.disconnect();
  const isConnected = () => realtimeManager.isConnected();

  return {
    connectionState,
    lastUpdate,
    isConnected,
    connect,
    disconnect,
    manager: realtimeManager,
  };
};