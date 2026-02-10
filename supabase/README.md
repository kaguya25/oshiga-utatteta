# Supabase Edge Functions 設定

## 環境変数の設定

Edge Functionをデプロイする前に、Supabaseダッシュボードで以下の環境変数を設定してください。

設定場所: Project Settings → Edge Functions → Manage secrets

- `YOUTUBE_API_KEY`: YouTube Data API v3のAPIキー
- `SPOTIFY_CLIENT_ID`: Spotify Client ID
- `SPOTIFY_CLIENT_SECRET`: Spotify Client Secret

これらの環境変数はSupabase CLIでローカルテスト時にも使用されます。

## ローカルテスト

```bash
# Supabase CLIをインストール（未インストールの場合）
npm install -g supabase

# Supabaseにログイン
supabase login

# プロジェクトにリンク
supabase link --project-ref rzbbricydqfwbouaoyoh

# Edge Functionをローカルで実行
supabase functions serve fetch-cover-songs --env-file supabase/.env

# 別のターミナルでテスト実行
curl -X POST http://localhost:54321/functions/v1/fetch-cover-songs \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6YmJyaWN5ZHFmd2JvdWFveW9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2MzA5NzksImV4cCI6MjA4NjIwNjk3OX0.-aUHOQKWAWrRV94THHyJ7Q2p15uzyKNg7zuYn9XuiU8"
```

## デプロイ

```bash
# Edge Functionをデプロイ
supabase functions deploy fetch-cover-songs
```

デプロイ後、Supabaseダッシュボードで環境変数が正しく設定されていることを確認してください。
