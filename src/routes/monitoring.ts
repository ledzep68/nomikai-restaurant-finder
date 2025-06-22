import { Router } from 'express';
import { MonitoringController } from '@/controllers/monitoringController';
import { sanitizeInput } from '@/middleware/sanitization';

const router = Router();
const monitoringController = new MonitoringController();

// API使用量統計
router.get('/usage-stats', 
  sanitizeInput,
  monitoringController.getUsageStats.bind(monitoringController)
);

// レート制限サマリー
router.get('/rate-limit-summary', 
  sanitizeInput,
  monitoringController.getRateLimitSummary.bind(monitoringController)
);

// 特定プラットフォームのレート制限状況
router.get('/rate-limit/:platform', 
  sanitizeInput,
  monitoringController.getPlatformRateLimit.bind(monitoringController)
);

// システム全体のヘルスチェック
router.get('/system-health', 
  sanitizeInput,
  monitoringController.getSystemHealth.bind(monitoringController)
);

// アラート履歴
router.get('/alerts', 
  sanitizeInput,
  monitoringController.getAlertHistory.bind(monitoringController)
);

// 使用量予測
router.get('/forecast/:platform', 
  sanitizeInput,
  monitoringController.getUsageForecast.bind(monitoringController)
);

export { router as monitoringRoutes };