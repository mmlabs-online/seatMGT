"use client";

import { useMemo, useState } from "react";
import { useAppStore } from "@/store/AppStore";
import { FilterChips, FilledInput, type ChipOption } from "@/components/ui";
import { DeviceTable } from "@/components/devices/DeviceTable";

type Filter = "all" | "placed" | "inventory";

const FILTERS: ChipOption<Filter>[] = [
  { value: "all", label: "All" },
  { value: "placed", label: "Placed" },
  { value: "inventory", label: "In Inventory" },
];

export default function DevicesPage() {
  const store = useAppStore();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const placed = store.devices.filter((d) => d.seatId).length;
  const inventory = store.devices.length - placed;

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return store.devices.filter((d) => {
      if (filter === "placed" && !d.seatId) return false;
      if (filter === "inventory" && d.seatId) return false;
      if (!q) return true;
      const owner = store.memberById(d.ownerMemberId);
      return [d.name, d.type, d.mac, d.inventoryNumber, owner?.name ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [store, filter, query]);

  return (
    <div className="relative px-6 md:px-7 pt-7 pb-12 max-w-[1160px] mx-auto">
      <div className="flex items-end justify-between gap-4 flex-wrap mb-5">
        <div>
          <h1 className="m-0 mb-1 text-[28px] font-extrabold tracking-[-0.01em] text-on-surface">
            Devices
          </h1>
          <p className="m-0 text-sm text-on-surface-variant">
            {placed} placed · {inventory} in inventory · {store.devices.length} total
          </p>
        </div>
        <FilterChips ariaLabel="Filter devices" options={FILTERS} value={filter} onChange={setFilter} />
      </div>

      <div className="mb-4 max-w-md">
        <FilledInput
          aria-label="Search devices"
          placeholder="Search name, MAC, inventory or owner…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <DeviceTable devices={rows} />
    </div>
  );
}
