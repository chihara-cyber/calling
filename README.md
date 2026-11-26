# Calling — ランダム音声通話 MVP

匿名の相手と1対1で音声通話するブラウザアプリです。TypeScript / React / Vite + Node.js / Socket.IO + WebRTC を使用します。

## 開発開始

Node.js 22以上推奨。

```bash
npm install
npm run dev
```

- ブラウザ: http://localhost:5173
- シグナリングサーバー: http://localhost:3001
- 別のタブ・ブラウザ・端末を開いて「相手を探す」を押してください。
- マイクの許可が必要です。実機でのWebRTCは HTTPS（localhost 以外）を使用してください。

## 構成

- `src/`: React フロントエンド
- `server/`: 待機列、相手のマッチング、WebRTC のシグナリング
- `shared/`: 共通イベント型
- `.env.example`: サーバーと STUN/TURN の設定例

## 機能

ランダムマッチング、マイク ON/OFF、スキップ、終了、通報、ブロック（同一接続中の再マッチ防止）、接続状態表示。ユーザーアカウントや録音はありません。通報はサーバーログ（接続IDおよび理由のみ、音声は保存しません）に記録されます。

## 制約・公開前の対応

これはローカル検証用のMVPであり、そのまま公開しないでください。公開時は認証/年齢対策、レート制限、荒らし対策、通報の永続化・審査フロー、利用規約、プライバシーポリシー、モデレーション、メトリクスが必要です。WebRTC のP2P音声通信はNAT環境により失敗する場合があり、TURNサーバーを本番環境に用意してください。IPアドレスが通信経路上で相手に露出する可能性があるため、本番ではリレー専用ポリシーも検討してください。

```bash
cp .env.example .env
# VITE_TURN_URL, VITE_TURN_USERNAME, VITE_TURN_CREDENTIAL を必要に応じて設定
npm run build
```

## API設計

Socket.IO の `join-queue`, `leave-queue`, `skip`, `end-call`, `signal`, `report`, `block` と、サーバーからの `matched`, `waiting`, `peer-left`, `signal`, `error-message` を使用します。

iOS / Android のアプリ化は Expo / React Native に移植する段階で検討します。WebRTC のネイティブ実装と審査対策は別途必要です。
