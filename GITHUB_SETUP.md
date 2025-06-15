# GitHub リポジトリセットアップ手順

## 1. GitHubでリポジトリを作成

1. https://github.com にアクセス
2. 「New repository」をクリック
3. リポジトリ設定：
   - **Repository name**: `nomikai-restaurant-finder`
   - **Description**: `Restaurant finder app for nomikai (drinking parties) - Phase-based development with external API integration`
   - **Visibility**: Public
   - **Initialize with**: 何も選択しない（空のリポジトリ）

## 2. ローカルリポジトリをプッシュ

リポジトリ作成後、以下のコマンドを実行：

```bash
cd /home/sojikoeie/nomikai-restaurant-finder

# リモートリポジトリを追加
git remote add origin https://github.com/[YOUR_USERNAME]/nomikai-restaurant-finder.git

# メインブランチに変更
git branch -M main

# リポジトリにプッシュ
git push -u origin main
```

## 3. 確認

プッシュ後、GitHub上で以下を確認：
- ✅ 全ファイルがアップロードされている
- ✅ README.mdが表示されている
- ✅ ディレクトリ構造が正しい
- ✅ コミット履歴が表示されている

## 現在の状態

- ローカルリポジトリ: 作成済み ✅
- 初回コミット: 完了 ✅
- Phase 1 実装: 完了 ✅
- リモートリポジトリ: 手動作成が必要 ⏳

リポジトリ作成とプッシュが完了しましたら、承認プロセスに進めます。