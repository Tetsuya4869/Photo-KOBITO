# フォトこびと（Photo KOBITO）

> 端末の中だけで働く、写真整理のちいさなこびと。

端末上の写真を **ブラウザの中だけ** で分析し、旅・場所・連写・シーンなどの手がかりから
**自動でアルバムを作ってグルーピング** するプライバシーファーストな Web アプリです。
写真は一切サーバーに送信されません（アップロードなし・通信なし）。

## できること

- 📁 端末の写真を選ぶ／ドラッグ＆ドロップ（クラウド不要）
- 🔍 ブラウザ内で特徴を分析：EXIF（撮影日時・GPS・カメラ）、知覚ハッシュ、支配色、明るさ・彩度・エッジなど
- 🗂 複数の手がかりで自動アルバム化
  - **旅行**（時間のかたまり＋遠方 GPS）… 例「那覇、2泊3日の旅 🚅」
  - **その日のできごと**（単日イベント）… 例「6月13日のおでかけ」
  - **場所**（GPS クラスタ＋オフライン地名辞書）… 例「清水寺あたり 📍」「いつもの場所 🏠」
  - **連写・そっくり写真**（pHash＋時間近接）… ベスト1枚を自動で表紙に … 例「そっくりさんフォト（12枚）👯」
  - **シーン**（画素ルール）… 「青空コレクション ☁️」「夜さんぽ 🌙」「おいしいもの記録 🍽️」「モノクロ写真 🎞️」
  - **スクショ整理 📱**・**デバイス別 📷**・**月次回収 🗓️**
- 💡 各アルバムに「なぜまとまった？」の平易な説明を必ず併記（判断の透明性）
- ✨ 実写がなくても試せる **サンプルモード**

## プライバシー設計

「写真を端末外に出さない」ことを、方針だけでなく **仕組み** で守っています。

1. **通信 API を一切使わない** — `src/privacy.test.ts` が `fetch`/`XMLHttpRequest`/`WebSocket`/
   `sendBeacon`/`EventSource`/`geolocation` の混入をビルド時に検出し、混入があればテストが落ちます。
2. **CSP `connect-src 'none'`** — `index.html` の Content-Security-Policy であらゆる送信をブラウザ側でブロック。
   画像は `data:`（合成サムネ）と `blob:`（取り込みファイル）のみ許可。
3. **外部リソースゼロ** — CDN・外部フォント・リモート画像・解析タグを使わず、すべて自己完結。

## アーキテクチャ

「頭脳」（特徴抽出・クラスタリング・命名）は **DOM 非依存の純粋関数** として実装し、
ブラウザにも Node にも依存せず単体テストできます。乱数は seed 注入で決定的。

```
src/
├─ core/                 # 純粋・決定的な「脳」（DOM 非依存）
│  ├─ features/          # exif, phash(DCT), color(k-means), stats, edges, extract
│  ├─ geo/               # haversine, dbscan, gazetteer（オフライン地名）
│  ├─ cluster/           # burst, timeline, places, scene, home, union
│  ├─ naming/            # titles, reason, holidays, season, cover
│  └─ util/              # seededRandom, distance, quantize
├─ pipeline/             # buildAlbums（統合）, demoData（サンプル＝ゴールデン）, schedule
├─ io/ + workers/        # デコード（唯一の DOM 依存層）。Worker + メインスレッド fallback
└─ app/                  # React UI（状態機械 empty→analyzing→result）
```

### 解析パイプライン

1. **デコード**（`io`/`workers`）— OffscreenCanvas でワーク画像（64×64）に縮小し、
   `createImageBitmap` で `PhotoFeature` を組み立て（ピクセルは持ち出さない）。非対応環境はメインスレッドに fallback。
2. **buildAlbums**（`pipeline`）— 純粋・同期。連写 → 時間 → 場所 → シーンの順に信号を集約し、
   優先度ラダー（旅行＞場所＞その日＞シーン＞連写）と Jaccard 重複統合で編成。
   **すべての写真が最低 1 つのアルバムに入る**（月次回収で取りこぼしを防止）ことを保証。

決定性の担保：入力を `(撮影時刻, id)` で正準ソートし、タイブレークを常に id で行うため、
**同じ入力 → 同じアルバム**／**入力順に依存しない** 出力になります（ゴールデンテストで検証）。

## 開発

```bash
npm install
npm run dev        # 開発サーバー
npm run test       # 単体テスト（watch）
npm run test:run   # 単体テスト（1回）
npm run typecheck  # 型チェック
npm run build      # 本番ビルド
npm run preview    # ビルド成果物をプレビュー
```

### テスト

- 120+ の単体テスト（`src/**/*.test.ts`）が純粋関数の「脳」を網羅
- `src/pipeline/buildAlbums.test.ts` はサンプルデータを **ゴールデンフィクスチャ** として、
  「写真ロスなし・決定性・入力順非依存・重複なし・アルバム構成」を固定
- `src/privacy.test.ts` が通信 API 非混入を構造的に強制

「デモで見えるもの ＝ テストが保証するもの」— サンプルモードとゴールデンテストは同一の入力を共有します。

## 技術スタック

Vite · React · TypeScript · Vitest（バックエンドなし）

## 制限・今後

- HEIC/HEIF はブラウザで直接デコードできないため、日時・GPS のみ活用（「そっと見守る」）。
- シーン・地名推定はオフラインのヒューリスティックで、断定を避けた「提案」として提示。
- 顔・人物アルバムは端末内・オフラインでは非搭載（将来 tfjs 等での上乗せ余地）。

## ライセンス

Apache License 2.0
