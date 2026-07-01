import type { CSSProperties } from "react";

/**
 * Material Symbols Outlined glyph. Uses the icon-name ligature, e.g.
 * <Icon name="grid_view" />. Decorative by default (aria-hidden); pass a label
 * to expose it to assistive tech.
 */
export function Icon({
  name,
  filled = false,
  size = 20,
  className = "",
  label,
  style,
}: {
  name: string;
  filled?: boolean;
  size?: number;
  className?: string;
  label?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      className={`i${filled ? " f" : ""} ${className}`}
      style={{ fontSize: size, ...style }}
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
    >
      {name}
    </span>
  );
}
