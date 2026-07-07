"use client";

import { useEffect, useState } from "react";
import type { Device } from "@/types";
import { useAppStore } from "@/store/AppStore";
import { searchDevices } from "@/lib/data/search";
import { deleteDevice } from "@/lib/actions/devices";
import { FilterChips, FilledInput, Button, type ChipOption } from "@/components/ui";
import { DeviceTable } from "@/components/devices/DeviceTable";
import { DeviceFormDialog } from "@/components/devices/DeviceFormDialog";

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
  // Seeded from the store so the table isn't empty before the first search
  // resolves; every filter/query change re-queries the server from then on.
  const [rows, setRows] = useState<Device[]>(store.devices);

  // Create/edit dialog: `formDevice === null` => create, a Device => edit.
  const [formOpen, setFormOpen] = useState(false);
  const [formDevice, setFormDevice] = useState<Device | null>(null);
  // Bumped after any create/edit/delete so the debounced search below re-runs
  // and the table reflects the mutation (the store also refreshes server-side).
  const [reloadKey, setReloadKey] = useState(0);

  const placed = store.devices.filter((d) => d.seatId).length;
  const inventory = store.devices.length - placed;

  useEffect(() => {
    let cancelled = false;
    const handle = setTimeout(async () => {
      const results = await searchDevices({ filter, query });
      if (!cancelled) setRows(results);
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [filter, query, reloadKey]);

  const openCreate = () => {
    setFormDevice(null);
    setFormOpen(true);
  };
  const openEdit = (device: Device) => {
    setFormDevice(device);
    setFormOpen(true);
  };

  const handleDelete = async (device: Device) => {
    if (!window.confirm(`Delete ${device.name}? This can't be undone.`)) return;
    try {
      await deleteDevice(device.id);
      setReloadKey((k) => k + 1);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "That action failed.");
    }
  };

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
        <div className="flex items-center gap-3">
          <FilterChips ariaLabel="Filter devices" options={FILTERS} value={filter} onChange={setFilter} />
          <Button icon="add" onClick={openCreate}>
            New device
          </Button>
        </div>
      </div>

      <div className="mb-4 max-w-md">
        <FilledInput
          aria-label="Search devices"
          placeholder="Search name, MAC, inventory or owner…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <DeviceTable devices={rows} onEdit={openEdit} onDelete={handleDelete} />

      {formOpen && (
        <DeviceFormDialog
          device={formDevice}
          onClose={() => setFormOpen(false)}
          onSaved={() => setReloadKey((k) => k + 1)}
        />
      )}
    </div>
  );
}
