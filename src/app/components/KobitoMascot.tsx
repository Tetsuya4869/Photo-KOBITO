export interface KobitoMascotProps {
  size?: number;
  /** アニメーションの有無（prefers-reduced-motion で止める用途）。 */
  animated?: boolean;
  className?: string;
}

/**
 * こびと（写真整理のちいさなお手伝い）のマスコット。とんがり帽子とカメラを持った姿。
 * 外部画像を使わずインライン SVG で描画（CSP セーフ）。
 */
export function KobitoMascot({ size = 96, animated = false, className }: KobitoMascotProps) {
  return (
    <svg
      className={`kobito ${animated ? 'kobito--animated' : ''} ${className ?? ''}`}
      width={size}
      height={size}
      viewBox="0 0 120 120"
      role="img"
      aria-label="フォトこびと"
    >
      <defs>
        <linearGradient id="kobitoHat" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7c8cff" />
          <stop offset="1" stopColor="#5b6be0" />
        </linearGradient>
        <linearGradient id="kobitoBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fef1dc" />
          <stop offset="1" stopColor="#f3d9b3" />
        </linearGradient>
      </defs>
      {/* 影 */}
      <ellipse cx="60" cy="108" rx="30" ry="6" fill="rgba(0,0,0,0.18)" />
      {/* からだ */}
      <path d="M32 74 Q32 44 60 44 Q88 44 88 74 L88 92 Q88 100 80 100 L40 100 Q32 100 32 92 Z" fill="url(#kobitoBody)" stroke="#e0b988" strokeWidth="1.5" />
      {/* とんがり帽子 */}
      <path d="M60 8 L86 52 Q60 44 34 52 Z" fill="url(#kobitoHat)" />
      <circle cx="60" cy="9" r="5" fill="#ffd66b" />
      {/* 目 */}
      <circle className="kobito-eye" cx="50" cy="66" r="4.2" fill="#2a2f45" />
      <circle className="kobito-eye" cx="70" cy="66" r="4.2" fill="#2a2f45" />
      {/* ほっぺ */}
      <circle cx="43" cy="74" r="4" fill="#ffb3b3" opacity="0.7" />
      <circle cx="77" cy="74" r="4" fill="#ffb3b3" opacity="0.7" />
      {/* 口 */}
      <path d="M54 76 Q60 82 66 76" fill="none" stroke="#2a2f45" strokeWidth="2" strokeLinecap="round" />
      {/* 小さなカメラ */}
      <g transform="translate(74 82)">
        <rect x="0" y="0" width="22" height="15" rx="3" fill="#3a3f5c" />
        <circle cx="11" cy="7.5" r="4.5" fill="#7c8cff" stroke="#fff" strokeWidth="1" />
        <rect x="3" y="-3" width="7" height="4" rx="1" fill="#3a3f5c" />
      </g>
    </svg>
  );
}
