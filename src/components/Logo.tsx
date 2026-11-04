/** The Avowly mark. The same artwork works on light and dark. */
export function Mark({ size = 28, className }: { size?: number; onDark?: boolean; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/brand/mark.png" width={size} height={size} alt="" aria-hidden className={className} />;
}

export function Logo({ size = 28, onDark = false }: { size?: number; onDark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Mark size={size} />
      <span className={`font-sans font-semibold tracking-tight ${onDark ? "text-paper" : "text-ink-900"}`} style={{ fontSize: size * 0.78 }}>
        Avowly
      </span>
    </span>
  );
}
