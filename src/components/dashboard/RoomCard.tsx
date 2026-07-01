import Link from "next/link";
import type { Room } from "@/types";
import { Icon } from "@/components/ui";

/** Clickable room card with a mini occupancy bar. Links to the layout view. */
export function RoomCard({
  room,
  occupied,
}: {
  room: Room;
  occupied: number;
}) {
  const total = room.layout.seatCount;
  const pct = total ? Math.round((occupied / total) * 100) : 0;
  return (
    <Link
      href={`/rooms/${room.code}`}
      className="state-layer text-left border border-outline-variant bg-surface-low rounded-md3-lg p-5 no-underline
                 flex flex-col gap-3.5 text-on-surface font-[inherit] shadow-[var(--card-shadow)]
                 transition-[transform,box-shadow,border-color] duration-150 ease-[cubic-bezier(0.2,0.7,0.2,1)]
                 hover:-translate-y-0.5 hover:border-outline hover:shadow-[var(--card-shadow-hover)]"
    >
      <div className="flex items-center gap-3">
        <span className="w-[46px] h-[46px] rounded-md3 bg-surface-highest text-on-surface border border-outline-variant flex items-center justify-center">
          <Icon name="meeting_room" size={24} />
        </span>
        <div className="flex flex-col leading-tight">
          <span className="text-[17px] font-extrabold tracking-[-0.01em]">{room.code}</span>
          <span className="text-xs text-on-surface-variant font-semibold">{room.name}</span>
        </div>
        <div className="flex-1" />
        <Icon name="chevron_right" size={22} className="text-on-surface-variant" />
      </div>
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] font-bold tabular-nums text-on-surface">
          {occupied}/{total} occupied
        </span>
        <span
          className="text-[13px] font-extrabold tabular-nums"
          style={{ color: "var(--accent-orange)" }}
        >
          {pct}%
        </span>
      </div>
      <div className="h-2.5 rounded-md bg-surface-highest overflow-hidden border border-outline-variant">
        <div
          className="neon-bar h-full rounded-md transition-[width] duration-500 ease-[cubic-bezier(0.2,0.7,0.2,1)]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </Link>
  );
}
