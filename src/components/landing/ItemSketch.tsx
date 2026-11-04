/** A line drawing of the item: a used phone, back and side, with the wear Avowly records. */
export function ItemSketch({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 240" className={className} fill="none" aria-hidden>
      <rect x="0.5" y="0.5" width="199" height="239" rx="10" fill="#EFEDF5" stroke="#E7E5F0" />
      {/* phone back */}
      <rect x="58" y="28" width="84" height="176" rx="14" fill="#FFFFFF" stroke="#15131F" strokeWidth="2" />
      {/* camera island */}
      <rect x="68" y="40" width="34" height="46" rx="10" stroke="#15131F" strokeWidth="1.6" />
      <circle cx="85" cy="53" r="7" stroke="#15131F" strokeWidth="1.6" />
      <circle cx="85" cy="73" r="7" stroke="#15131F" strokeWidth="1.6" />
      <circle cx="112" cy="47" r="2.2" fill="#15131F" />
      {/* side buttons */}
      <path d="M142.5 70 V96 M142.5 104 V118" stroke="#15131F" strokeWidth="2.4" strokeLinecap="round" />
      {/* recorded wear: a scuff near the camera, a nick on the corner */}
      <path d="M108 98 L118 92 M111 102 L123 95" stroke="#6D3DF5" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M134 196 Q138 194 139 189" stroke="#6D3DF5" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="120" cy="96" r="16" stroke="#6D3DF5" strokeWidth="1" strokeDasharray="3 3" />
      <text x="146" y="210" fontSize="9" fontFamily="var(--font-geist-mono), monospace" fill="#4F25C9">mark 2</text>
      <text x="140" y="82" fontSize="9" fontFamily="var(--font-geist-mono), monospace" fill="#4F25C9">mark 1</text>
    </svg>
  );
}
