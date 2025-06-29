const express = require('express');
const path = require('path');
const app = express();
const PORT = 9000;

// CORS設定
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  next();
});

// 静的ファイル提供
app.use(express.static(__dirname));

// ルートパス
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'test-frontend.html'));
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`🚀 Server running at http://127.0.0.1:${PORT}`);
  console.log('Available pages:');
  console.log(`  - Main: http://127.0.0.1:${PORT}/test-frontend.html`);
  console.log(`  - Detail: http://127.0.0.1:${PORT}/restaurant-detail.html`);
});