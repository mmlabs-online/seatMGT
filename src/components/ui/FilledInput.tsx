import type { InputHTMLAttributes } from "react";
import { Icon } from "./Icon";

/**
 * MD3 filled text field with a leading icon and the characteristic tonal
 * surface + bottom accent on focus.
 */
export function FilledInput({
  icon = "search",
  className = "",
  id,
  "aria-label": ariaLabel,
  ...rest
}: { icon?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div
      className={[
        "group flex items-center gap-2.5 rounded-md3 bg-surface",
        "px-4 h-12 border border-outline-variant",
        "focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgba(251,87,41,0.15)]",
        "transition-[border-color,box-shadow] duration-150 ease-[cubic-bezier(0.2,0.7,0.2,1)]",
        className,
      ].join(" ")}
    >
      <Icon name={icon} size={20} className="text-on-surface-variant" />
      <input
        id={id}
        aria-label={ariaLabel}
        className="flex-1 min-w-0 bg-transparent outline-none text-sm font-medium text-on-surface placeholder:text-on-surface-variant"
        {...rest}
      />
    </div>
  );
}
