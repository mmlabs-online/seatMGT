"use client";

import { useMemo, useState } from "react";
import type { Room } from "@/types";
import type { DashboardSummary } from "@/lib/data";
import { FilterChips, type ChipOption } from "@/components/ui";
import { RoomCard } from "@/components/dashboard/RoomCard";

/** Floor filter is pure client UI state — the occupancy numbers themselves
 * come from the server (`getDashboardSummary()`), not a client reduction. */
export function DashboardRooms({
  rooms,
  perRoom,
}: {
  rooms: Room[];
  perRoom: DashboardSummary["perRoom"];
}) {
  const [floor, setFloor] = useState<string>("all");

  const occupiedByRoomId = useMemo(
    () => new Map(perRoom.map((r) => [r.roomId, r.occupied])),
    [perRoom],
  );

  const floors = useMemo(
    () => Array.from(new Set(rooms.map((r) => r.floor))).sort(),
    [rooms],
  );
  const floorOptions: ChipOption<string>[] = [
    { value: "all", label: "All floors" },
    ...floors.map((f) => ({ value: f, label: f })),
  ];
  const visibleRooms = rooms.filter((r) => floor === "all" || r.floor === floor);

  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-3.5 flex-wrap">
        <h2 className="m-0 text-[18px] font-extrabold text-on-surface">Rooms</h2>
        <FilterChips
          ariaLabel="Filter rooms by floor"
          options={floorOptions}
          value={floor}
          onChange={setFloor}
        />
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
        {visibleRooms.map((room) => (
          <RoomCard key={room.id} room={room} occupied={occupiedByRoomId.get(room.id) ?? 0} />
        ))}
      </div>
    </>
  );
}
