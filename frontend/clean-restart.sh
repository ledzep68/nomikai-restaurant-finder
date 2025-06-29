#!/bin/bash
# クリーンな再起動スクリプト

echo "Cleaning and restarting frontend..."

# Node modulesのキャッシュをクリア
rm -rf node_modules/.vite
rm -rf node_modules/.cache

# Viteのキャッシュをクリア
rm -rf .vite

# 開発サーバーを再起動
echo "Starting development server..."
npm run dev