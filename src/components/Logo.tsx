/** The Avowly mark: an A whose crossbar is a check mark. Inline so it inherits no fetch. */
export function Mark({ size = 28, onDark = false, className }: { size?: number; onDark?: boolean; className?: string }) {
  const ink = onDark ? "#F4F1EA" : "#141413";
  const brass = onDark ? "#C89B6B" : "#A67C52";
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden className={className}>
      <path d="M9 55 L32 9 L55 55" stroke={ink} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M24.5 38.5 L30.5 44.5 L39.5 33.5" stroke={brass} strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ size = 28, onDark = false }: { size?: number; onDark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Mark size={size} onDark={onDark} />
      <span className={`font-serif font-semibold tracking-tight ${onDark ? "text-paper" : "text-ink-900"}`} style={{ fontSize: size * 0.82 }}>
        Avowly
      </span>
    </span>
  );
}
