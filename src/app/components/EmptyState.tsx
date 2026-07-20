import { KobitoMascot } from './KobitoMascot';
import { PrivacyBadge } from './PrivacyBadge';

export interface EmptyStateProps {
  onPickFiles: () => void;
  onDemo: () => void;
}

export function EmptyState({ onPickFiles, onDemo }: EmptyStateProps) {
  return (
    <section className="empty">
      <KobitoMascot size={150} animated />
      <h1 className="empty-title">フォトこびと</h1>
      <p className="tagline">
        端末の中だけで働く、写真整理のちいさなこびと。
        <br />
        写真を見て、旅・場所・連写・シーンごとに、自動でアルバムを作ります。
      </p>

      <div className="cta-row">
        <button type="button" className="btn btn-primary" onClick={onDemo}>
          ✨ こびとにおまかせ（サンプルで試す）
        </button>
        <button type="button" className="btn btn-secondary" onClick={onPickFiles}>
          📁 自分の写真をえらぶ
        </button>
      </div>

      <PrivacyBadge />

      <ol className="how">
        <li>
          <span className="how-num">1</span> 端末から写真を選ぶ（またはドラッグ＆ドロップ）
        </li>
        <li>
          <span className="how-num">2</span> こびとがブラウザの中だけで特徴を分析
        </li>
        <li>
          <span className="how-num">3</span> 自動でアルバムに仕分け。「なぜ？」も見られます
        </li>
      </ol>
    </section>
  );
}
