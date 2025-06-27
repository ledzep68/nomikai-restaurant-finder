// WebSocket機能は完全に無効化されています
// このファイルはダミー実装のみを提供します

// ダミーのRealtimeManagerクラス
export class RealtimeManager {
  constructor() {
    console.log('WebSocket functionality is completely disabled');
  }

  connect() {
    console.log('WebSocket connect() called but disabled');
    return Promise.resolve();
  }

  disconnect() {
    console.log('WebSocket disconnect() called but disabled');
  }

  on() {
    // Do nothing
  }

  off() {
    // Do nothing
  }

  send() {
    return false;
  }

  getConnectionState() {
    return 'disabled';
  }

  isConnected() {
    return false;
  }
}

// シングルトンインスタンス（ダミー）
export const realtimeManager = new RealtimeManager();

// React Hook（ダミー）
export const useRealtime = () => {
  console.log('useRealtime hook called - WebSocket is disabled');
  
  return {
    connectionState: 'disabled',
    lastUpdate: null,
    isConnected: () => false,
    connect: () => Promise.resolve(),
    disconnect: () => {},
    manager: null,
  };
};