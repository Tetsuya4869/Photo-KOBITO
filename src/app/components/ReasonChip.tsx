import { useId, useState } from 'react';

export interface ReasonChipProps {
  reason: string;
}

/**
 * 「なぜまとまった？」を第一級 UI に。タップで平易な日本語の根拠を開示する。
 * こびとの判断を検証可能にし、信頼を作るための要素。
 */
export function ReasonChip({ reason }: ReasonChipProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="reason">
      <button
        type="button"
        className="reason-chip"
        aria-expanded={open}
        aria-controls={id}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <span aria-hidden="true">💡</span> なぜまとまった？
      </button>
      {open && (
        <p id={id} className="reason-text">
          {reason}
        </p>
      )}
    </div>
  );
}
