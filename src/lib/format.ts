/** Pure string helpers shared across Server and Client Components — no "use
 * client" here on purpose, since e.g. Avatar can render from either. */

export function initials(name: string): string {
  const parts = name.replace(/\(.*\)/, "").trim().split(/\s+/);
  return (
    ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?"
  );
}

export function lastName(name: string): string {
  const parts = name.replace(/\(.*\)/, "").trim().split(/\s+/);
  return parts[parts.length - 1] ?? name;
}
