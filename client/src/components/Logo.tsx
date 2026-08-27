// Chip & Chill brand mark — golf ball with chip-shot arc (concept #1).
// Reverses automatically on dark backgrounds via currentColor + prop.
interface LogoProps {
  size?: number;
  dark?: boolean; // true when placed on a dark background
}

export default function Logo({ size = 34, dark = false }: LogoProps) {
  const scale = size / 34;
  return (
    <svg
      width={46 * scale}
      height={size}
      viewBox="0 0 46 34"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2 30 Q 16 4, 34 12"
        stroke={dark ? "#C9A876" : "#2D6A4F"}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity="0.55"
      />
      <circle cx="37" cy="10" r="7" fill="#D4A017" />
      {!dark && (
        <>
          <circle cx="34.5" cy="7.5" r="0.8" fill="#1B4332" opacity="0.3" />
          <circle cx="39" cy="8.5" r="0.7" fill="#1B4332" opacity="0.3" />
          <circle cx="37" cy="12" r="0.7" fill="#1B4332" opacity="0.3" />
        </>
      )}
    </svg>
  );
}
