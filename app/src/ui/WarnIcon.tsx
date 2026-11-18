export function WarnIcon({ size }: { size: number }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3.5 2.5 20h19z" />
      <path d="M12 10v4.5" />
      <path d="M12 17.5v.01" />
    </svg>
  );
}
