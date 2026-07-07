"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAppStore } from "@/store/AppStore";
import { searchSeats, type SeatSearchResult } from "@/lib/data/search";
import { confirmAndDeleteRoom } from "@/lib/confirmDeleteRoom";
import { RoomCard } from "@/components/dashboard/RoomCard";
import { NewRoomDialog } from "@/components/dashboard/NewRoomDialog";
import { FilledInput, Icon, Button } from "@/components/ui";
import { ROLE_RANK } from "@/types";

export default function RoomsPage() {
  const store = useAppStore();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SeatSearchResult[]>([]);
  const [newRoomOpen, setNewRoomOpen] = useState(false);
  const canCreateRoom = store.rank >= ROLE_RANK.admin;

  const handleDeleteRoom = (room: { id: string; code: string }) => {
    confirmAndDeleteRoom(room.id, room.code);
  };

  useEffect(() => {
    let cancelled = false;
    const handle = setTimeout(async () => {
      const found = await searchSeats(query);
      if (!cancelled) setResults(found);
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query]);

  return (
    <div className="relative px-6 md:px-7 pt-7 pb-12 max-w-[1120px] mx-auto">
      <div className="blob w-72 h-72 -top-16 left-0" style={{ background: "var(--accent-orange)", opacity: 0.06 }} aria-hidden />
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="m-0 mb-1 text-[28px] font-extrabold tracking-[-0.01em] text-on-surface">Rooms</h1>
          <p className="m-0 text-sm text-on-surface-variant">
            {store.rooms.length} rooms · pick one to open its seat map.
          </p>
        </div>
        {canCreateRoom && (
          <Button icon="add" onClick={() => setNewRoomOpen(true)}>
            New room
          </Button>
        )}
      </div>

      <div className="mb-4 max-w-md relative">
        <FilledInput
          icon="search"
          aria-label="Find a seat by code or occupant"
          placeholder="Find a seat by code or occupant…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query.trim() && (
          <div className="absolute left-0 right-0 mt-1.5 bg-surface-high border border-outline-variant rounded-md3 shadow-[var(--card-shadow-hover)] overflow-hidden z-10">
            {results.length === 0 ? (
              <div className="px-4 py-3 text-[13px] text-on-surface-variant font-semibold">
                No matching seats.
              </div>
            ) : (
              results.map((r) => (
                <Link
                  key={r.seatId}
                  href={`/rooms/${r.roomCode}?seat=${r.code}`}
                  className="state-layer flex items-center gap-3 px-4 py-2.5 no-underline text-on-surface font-[inherit]"
                >
                  <Icon name="chair" size={18} className="text-on-surface-variant" />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-bold font-mono">{r.code}</span>
                    <span className="block text-xs text-on-surface-variant font-medium">
                      {r.roomName}
                      {r.occupantName ? ` · ${r.occupantName}` : " · Empty"}
                    </span>
                  </span>
                </Link>
              ))
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
        {store.rooms.map((room) => (
          <RoomCard
            key={room.id}
            room={room}
            occupied={store.seatsForRoom(room.id).filter((s) => s.occupantMemberId).length}
            onDelete={canCreateRoom ? () => handleDeleteRoom(room) : undefined}
          />
        ))}
      </div>

      {canCreateRoom && (
        <NewRoomDialog open={newRoomOpen} onClose={() => setNewRoomOpen(false)} />
      )}
    </div>
  );
}
