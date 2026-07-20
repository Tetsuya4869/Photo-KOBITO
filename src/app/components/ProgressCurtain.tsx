import { KobitoMascot } from './KobitoMascot';
import { PrivacyBadge } from './PrivacyBadge';
import type { AnalyzeProgress } from '../../workers/decodeClient';

export interface ProgressCurtainProps {
  progress: AnalyzeProgress;
  phase: string;
}

export function ProgressCurtain({ progress, phase }: ProgressCurtainProps) {
  const { done, total } = progress;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <section className="curtain" aria-live="polite">
      <div className="curtain-mascot">
        <KobitoMascot size={120} animated />
      </div>
      <p className="curtain-phase">{phase}…</p>
      <div className="progressbar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className={`progressbar-fill ${total === 0 ? 'progressbar-fill--indeterminate' : ''}`} style={total > 0 ? { width: `${pct}%` } : undefined} />
      </div>
      {total > 0 && (
        <p className="curtain-counter">
          {done}/{total}枚を見ています
        </p>
      )}
      <PrivacyBadge compact />
    </section>
  );
}
