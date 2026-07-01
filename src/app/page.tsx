"use client";

import { useMemo, useState } from "react";
import { useAppStore } from "@/store/AppStore";
import { FilterChips, type ChipOption } from "@/components/ui";
import { StatCard } from "@/components/dashboard/StatCard";
import { RoomCard } from "@/components/dashboard/RoomCard";
import { OccupancyRing } from "@/components/dashboard/OccupancyRing";

export default function DashboardPage() {
  const store = useAppStore();
  const [floor, setFloor] = useState<string>("all");

  const totals = useMemo(() => {
    const totalSeats = store.rooms.reduce((n, r) => n + r.layout.seatCount, 0);
    const occupied = store.seats.filter((s) => s.occupantMemberId).length;
    const placed = store.devices.filter((d) => d.seatId).length;
    const inventory = store.devices.length - placed;
    const rate = totalSeats ? Math.round((occupied / totalSeats) * 100) : 0;
    return { totalSeats, occupied, placed, inventory, rate };
  }, [store.rooms, store.seats, store.devices]);

  const floors = useMemo(
    () => Array.from(new Set(store.rooms.map((r) => r.floor))).sort(),
    [store.rooms],
  );
  const floorOptions: ChipOption<string>[] = [
    { value: "all", label: "All floors" },
    ...floors.map((f) => ({ value: f, label: f })),
  ];
  const visibleRooms = store.rooms.filter((r) => floor === "all" || r.floor === floor);

  return (
    <div className="relative px-6 md:px-7 pt-7 pb-12 max-w-[1120px] mx-auto">
      <div className="blob w-72 h-72 -top-16 right-0" style={{ background: "var(--accent-orange)", opacity: 0.06 }} aria-hidden />

      <h1 className="m-0 mb-1 text-[28px] font-extrabold tracking-[-0.01em] text-on-surface">
        Overview
      </h1>
      <p className="m-0 mb-6 text-sm text-on-surface-variant">
        Seats, ports and equipment across Building C.
      </p>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-4 mb-7">
        <StatCard icon="meeting_room" value={String(store.rooms.length)} label="Rooms" badge="Bldg C" />
        <StatCard
          icon="chair"
          value={String(totals.totalSeats)}
          label="Seats / ports"
          badge={`${totals.occupied} used`}
          iconBg="var(--secondary-container)"
          iconFg="var(--on-secondary-container)"
        />
        <StatCard
          icon="donut_large"
          value={`${totals.rate}%`}
          label="Occupancy rate"
          iconBg="var(--tertiary-container)"
          iconFg="var(--on-tertiary-container)"
        >
          <OccupancyRing pct={totals.rate} />
        </StatCard>
        <StatCard
          icon="lan"
          value={`${totals.placed} / ${totals.inventory}`}
          label="Placed / in inventory"
          badge={`${store.devices.length} total`}
        />
      </div>

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
          <RoomCard
            key={room.id}
            room={room}
            occupied={store.seatsForRoom(room.id).filter((s) => s.occupantMemberId).length}
          />
        ))}
      </div>
    </div>
  );
}
