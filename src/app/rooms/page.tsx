"use client";

import { useAppStore } from "@/store/AppStore";
import { RoomCard } from "@/components/dashboard/RoomCard";

export default function RoomsPage() {
  const store = useAppStore();
  return (
    <div className="relative px-6 md:px-7 pt-7 pb-12 max-w-[1120px] mx-auto">
      <div className="blob w-72 h-72 -top-16 left-0" style={{ background: "var(--accent-orange)", opacity: 0.06 }} aria-hidden />
      <h1 className="m-0 mb-1 text-[28px] font-extrabold tracking-[-0.01em] text-on-surface">Rooms</h1>
      <p className="m-0 mb-6 text-sm text-on-surface-variant">
        {store.rooms.length} rooms · pick one to open its seat map.
      </p>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
        {store.rooms.map((room) => (
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
