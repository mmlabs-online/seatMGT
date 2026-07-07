import { initials } from "@/lib/format";

/** Initial-based circular avatar tinted by the member's group color. */
export function Avatar({
  name,
  color,
  size = 44,
}: {
  name: string;
  color?: string;
  size?: number;
}) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full font-extrabold text-white flex-none"
      style={{
        width: size,
        height: size,
        background: color ?? "var(--secondary)",
        fontSize: Math.round(size * 0.34),
      }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
