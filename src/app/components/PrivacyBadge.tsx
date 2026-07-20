export interface PrivacyBadgeProps {
  compact?: boolean;
}

/** 「写真は端末から出ません」を常時示す信頼バッジ。 */
export function PrivacyBadge({ compact = false }: PrivacyBadgeProps) {
  return (
    <div className="privacy-badge" role="note">
      <span aria-hidden="true">🔒</span>
      <span>{compact ? '端末内だけで処理' : '写真はこの端末の中だけで処理しています（どこにも送信しません）'}</span>
    </div>
  );
}
