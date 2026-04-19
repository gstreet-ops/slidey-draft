import Link from "next/link";

type Props = {
  /** Trade log row id — builds the #trade-<id> anchor link */
  tradeId: string;
  previousTeamAbbreviation: string;
  newTeamAbbreviation: string;
  /** Optional size override in pixels for the swap glyph. */
  size?: number;
  /** Extra classes merged onto the root span. */
  className?: string;
};

/**
 * Subtle trade indicator shown next to a team on any draft-order slot that
 * was affected by a trade. Clicks jump to the specific trade in the log.
 * Desktop hover shows a native tooltip via `title`.
 */
export function TradeIndicator({
  tradeId,
  previousTeamAbbreviation,
  newTeamAbbreviation,
  size = 14,
  className = "",
}: Props) {
  const label = `Traded: ${previousTeamAbbreviation} → ${newTeamAbbreviation}`;
  return (
    <Link
      href={`/trades#trade-${tradeId}`}
      title={label}
      aria-label={label}
      className={`inline-flex items-center justify-center rounded-full bg-amber-50 text-amber-600 hover:bg-amber-100 hover:text-amber-700 transition ${className}`}
      style={{ width: size + 6, height: size + 6 }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M3 5h9l-2-2" />
        <path d="M13 11H4l2 2" />
      </svg>
    </Link>
  );
}
