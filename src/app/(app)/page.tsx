import { getDashboardSummary, getRooms } from "@/lib/data";
import { StatCard } from "@/components/dashboard/StatCard";
import { OccupancyRing } from "@/components/dashboard/OccupancyRing";
import { DashboardRooms } from "@/components/dashboard/DashboardRooms";

export default async function DashboardPage() {
  const [summary, rooms] = await Promise.all([getDashboardSummary(), getRooms()]);

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
        <StatCard icon="meeting_room" value={String(rooms.length)} label="Rooms" badge="Bldg C" />
        <StatCard
          icon="chair"
          value={String(summary.totalSeats)}
          label="Seats / ports"
          badge={`${summary.occupied} used`}
          iconBg="var(--secondary-container)"
          iconFg="var(--on-secondary-container)"
        />
        <StatCard
          icon="donut_large"
          value={`${summary.rate}%`}
          label="Occupancy rate"
          iconBg="var(--tertiary-container)"
          iconFg="var(--on-tertiary-container)"
        >
          <OccupancyRing pct={summary.rate} />
        </StatCard>
        <StatCard
          icon="lan"
          value={`${summary.devicesPlaced} / ${summary.devicesInInventory}`}
          label="Placed / in inventory"
          badge={`${summary.devicesTotal} total`}
        />
      </div>

      <DashboardRooms rooms={rooms} perRoom={summary.perRoom} />
    </div>
  );
}
