/**
 * 共有型の中心。ここは「純粋性の境界」であり、DOM型を一切 import しない。
 *
 * PhotoFeature は 1 枚の写真から抽出した軽量（〜200バイト）なプレーンオブジェクト。
 * cluster / naming / pipeline 層は、この型だけを入力に取り、ブラウザにも Node にも
 * 依存しないため完全に単体テストできる。実ファイルやピクセルはここには現れない。
 */

export type PhotoId = string;

/** EXIF から取り出した生メタデータ（見つからなかった項目は undefined / null）。 */
export interface ExifData {
  /** DateTimeOriginal を「壁時計をUTCとみなした」epoch ms に変換した値。TZ非依存で決定的。 */
  takenAt: number | null;
  gps: LatLng | null;
  make?: string;
  model?: string;
  /** EXIF Orientation (1..8)。未指定は 1 相当。 */
  orientation?: number;
  fNumber?: number;
  iso?: number;
  focalLength?: number;
  /** 露出時間（秒）。 */
  exposure?: number;
  pixelWidth?: number;
  pixelHeight?: number;
}

export interface LatLng {
  lat: number;
  lon: number;
}

export interface DominantColor {
  /** '#rrggbb' */
  hex: string;
  /** CIELab 座標。色の近さ判定に使う。 */
  lab: [number, number, number];
  /** そのクラスタが占める面積比 0..1。降順に並ぶ。 */
  weight: number;
}

export type TakenAtSource = 'exif' | 'mtime';

export interface CameraInfo {
  make?: string;
  model?: string;
  fNumber?: number;
  iso?: number;
  focalLength?: number;
  exposure?: number;
}

/**
 * 1 枚の写真の全特徴。cluster 層の唯一の入力。
 * すべて決定的に計算され、シリアライズ可能なプレーン値のみを持つ。
 */
export interface PhotoFeature {
  id: PhotoId;
  name: string;
  sizeBytes: number;
  /** 元画像の実ピクセル幅・高さ（縮小前）。 */
  width: number;
  height: number;
  /** width / height。1 未満は縦長、1 より大きいと横長。 */
  aspect: number;

  /** 撮影時刻 epoch ms。EXIF が無ければ file.lastModified を使い source で区別。null は時刻不明。 */
  takenAt: number | null;
  takenAtSource: TakenAtSource;

  gps: LatLng | null;
  camera: CameraInfo | null;

  /** 知覚ハッシュ（pHash）を 16 文字の hex 文字列で保持（64bit）。連写・重複判定に使う。 */
  phash: string;

  /** 支配色（面積比 降順、最大 3 色程度）。 */
  colors: DominantColor[];

  /** 以下、0..1 に正規化したマクロ特徴（一部は符号付き）。 */
  brightness: number;
  saturation: number;
  contrast: number;
  edgeDensity: number;
  /** (meanR - meanB) / 255。暖色で正、寒色で負。 */
  warmth: number;
  /** colorfulness (Hasler–Süsstrunk)。0..~150 程度の生値。 */
  colorfulness: number;
  /** 画像上半分が「青空」らしい画素の割合 0..1。 */
  blueTopRatio: number;
  /** 画面全体で「緑（植物）」らしい画素の割合 0..1。 */
  greenRatio: number;
  /** 輝度の分散。全黒/全白フレーム（pHash が縮退する）検出に使う。 */
  lumaVariance: number;

  /** worker が生成した小さなカバー用サムネ（data URL）。テスト/デモでは合成値。 */
  coverThumb?: string;
}

export type Confidence = 'high' | 'med' | 'low';

export type AlbumKind =
  | 'trip'
  | 'place'
  | 'day'
  | 'scene'
  | 'burst'
  | 'screenshot'
  | 'device'
  | 'monthly';

/** 命名前の中間表現。reconcile が組み立て、naming がタイトル・絵文字・理由を与える。 */
export interface AlbumDraft {
  kind: AlbumKind;
  photoIds: PhotoId[];
  coverId: PhotoId;
  confidence: Confidence;
  dateRange?: [number, number];
  /** 場所アルバムの命名文脈。 */
  place?: { name: string; isHome: boolean; known: boolean } | null;
  /** シーンアルバムのラベル（'青空' など）。 */
  sceneLabel?: string;
  /** 旅行の宿泊日数（trip のみ）。 */
  tripNights?: number;
  /** 単日イベントかどうか（day のみ）。 */
  singleDay?: boolean;
  /** 連写の内訳（burst のみ）。 */
  burstSubtype?: 'burst' | 'dup';
  /** 機種名（device のみ）。 */
  deviceModel?: string;
  /** 月次回収（monthly のみ）。 */
  monthKey?: { year: number; month: number };
}

/**
 * 自動生成されたアルバム。写真は排他分割ではなく複数アルバム（レンズ）に属しうる。
 */
export interface Album {
  id: string;
  kind: AlbumKind;
  title: string;
  emoji: string;
  /** 「なぜまとまったか」の平易な日本語説明。 */
  reason: string;
  confidence: Confidence;
  photoIds: PhotoId[];
  coverId: PhotoId;
  /** このアルバムに横断的に付いたシーンタグ（'青空' など）。 */
  sceneTags: string[];
  /** [最古, 最新] の撮影時刻 epoch ms（時刻が取れた写真がある場合）。 */
  dateRange?: [number, number];
}
