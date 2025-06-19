const express = require('express');
const path = require('path');

const app = express();
const PORT = 8080;

// Serve static files from public directory
app.use(express.static('public'));

// Serve a simple demo page
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nomikai Restaurant Finder - Demo</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            text-align: center;
            padding: 40px 0;
        }
        .header h1 {
            font-size: 3rem;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        .header p {
            font-size: 1.2rem;
            opacity: 0.9;
        }
        .features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 30px;
            margin: 40px 0;
        }
        .feature-card {
            background: rgba(255,255,255,0.1);
            border-radius: 15px;
            padding: 30px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
        }
        .feature-card h3 {
            color: #ffeb3b;
            margin-bottom: 15px;
        }
        .search-demo {
            background: rgba(255,255,255,0.95);
            color: #333;
            border-radius: 15px;
            padding: 30px;
            margin: 40px 0;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
        }
        input, select {
            width: 100%;
            padding: 10px;
            border: 2px solid #ddd;
            border-radius: 5px;
            box-sizing: border-box;
        }
        button {
            background: #667eea;
            color: white;
            padding: 12px 30px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 1rem;
            transition: background 0.3s;
        }
        button:hover {
            background: #5a67d8;
        }
        .status {
            background: rgba(255,255,255,0.1);
            border-radius: 10px;
            padding: 20px;
            margin: 20px 0;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🍻 Nomikai Restaurant Finder</h1>
            <p>飲み会に最適なレストランを見つけるWebアプリケーション</p>
        </div>

        <div class="status">
            <h3>🚀 開発ステータス</h3>
            <p><strong>Phase 3: フロントエンド開発</strong> - 進行中</p>
            <p>サーバー起動成功! ポート ` + PORT + ` で動作中</p>
        </div>

        <div class="features">
            <div class="feature-card">
                <h3>🔍 高度な検索機能</h3>
                <p>場所、ジャンル、価格帯、人数など、詳細な条件でレストランを検索できます。</p>
            </div>
            <div class="feature-card">
                <h3>⭐ 統合評価システム</h3>
                <p>複数のプラットフォームからの評価を統合し、最適なレストランを推薦します。</p>
            </div>
            <div class="feature-card">
                <h3>📱 レスポンシブデザイン</h3>
                <p>PC、タブレット、スマートフォンなど、あらゆるデバイスで快適に利用できます。</p>
            </div>
        </div>

        <div class="search-demo">
            <h3>🍽️ レストラン検索デモ</h3>
            <form onsubmit="searchDemo(event)">
                <div class="form-group">
                    <label for="location">場所</label>
                    <input type="text" id="location" placeholder="例: 渋谷, 新宿, 東京駅" />
                </div>
                <div class="form-group">
                    <label for="genre">ジャンル</label>
                    <select id="genre">
                        <option value="">すべて</option>
                        <option value="japanese">和食</option>
                        <option value="italian">イタリアン</option>
                        <option value="chinese">中華</option>
                        <option value="izakaya">居酒屋</option>
                        <option value="yakiniku">焼肉</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="capacity">人数</label>
                    <select id="capacity">
                        <option value="2">2人</option>
                        <option value="4">4人</option>
                        <option value="6">6人</option>
                        <option value="8">8人</option>
                        <option value="10">10人</option>
                    </select>
                </div>
                <button type="submit">🔍 検索</button>
            </form>
            <div id="search-result" style="margin-top: 20px;"></div>
        </div>

        <div class="status">
            <h3>📋 実装済み機能</h3>
            <p>✅ React + TypeScript + Vite セットアップ</p>
            <p>✅ Material-UI デザインシステム</p>
            <p>✅ Redux Toolkit 状態管理</p>
            <p>✅ React Router ナビゲーション</p>
            <p>✅ Jest テストスイート (93/111 テスト成功)</p>
            <p>🔧 バックエンドAPI統合 (進行中)</p>
        </div>
    </div>

    <script>
        function searchDemo(event) {
            event.preventDefault();
            const location = document.getElementById('location').value;
            const genre = document.getElementById('genre').value;
            const capacity = document.getElementById('capacity').value;
            
            const result = document.getElementById('search-result');
            result.innerHTML = '<p style="color: #667eea; font-weight: bold;">🔍 検索中...</p>';
            
            setTimeout(() => {
                result.innerHTML = 
                    '<div style="background: #f0f8ff; padding: 15px; border-radius: 5px; border-left: 4px solid #667eea;">' +
                        '<h4 style="color: #333; margin-top: 0;">検索結果 (デモ)</h4>' +
                        '<p><strong>場所:</strong> ' + (location || '指定なし') + '</p>' +
                        '<p><strong>ジャンル:</strong> ' + (genre || 'すべて') + '</p>' +
                        '<p><strong>人数:</strong> ' + capacity + '人</p>' +
                        '<p style="color: #666; font-style: italic;">実際のデータ取得には、バックエンドAPIとの統合が必要です。</p>' +
                    '</div>';
            }, 1000);
        }
    </script>
</body>
</html>
  `);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Nomikai Restaurant Finder Demo Server running on:');
  console.log('   Local:   http://localhost:' + PORT + '/');
  console.log('   Network: http://0.0.0.0:' + PORT + '/');
  console.log('');
  console.log('📱 Access from Windows host at:');
  console.log('   http://172.20.178.81:' + PORT + '/');
  console.log('   http://10.255.255.254:' + PORT + '/');
});