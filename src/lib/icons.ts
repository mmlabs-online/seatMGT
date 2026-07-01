import type { DeviceType } from "@/types";

/** Material Symbol per device type. */
export const DEVICE_ICONS: Record<DeviceType, string> = {
  Laptop: "laptop_mac",
  Monitor: "monitor",
  Desktop: "desktop_windows",
  Dock: "dock",
  "VoIP Phone": "call",
  Tablet: "tablet_mac",
};

export function deviceIcon(type: DeviceType): string {
  return DEVICE_ICONS[type] ?? "lan";
}
