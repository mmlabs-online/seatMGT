"use client";

import { useState } from "react";
import type { Device, DeviceType } from "@/types";
import { useAppStore } from "@/store/AppStore";
import { createDevice, updateDevice } from "@/lib/actions/devices";
import { DEVICE_ICONS } from "@/lib/icons";
import { EntityFormDialog, DialogField, DialogSelect } from "@/components/ui";

/** The 6 canonical device types (from the `DeviceType` union). The server
 * accepts any non-empty string, but the UI constrains to the known set so the
 * type icon always resolves. */
const DEVICE_TYPES = Object.keys(DEVICE_ICONS) as DeviceType[];

type FormState = {
  name: string;
  type: DeviceType;
  inventoryNumber: string;
  mac: string;
  ownerMemberId: string;
};

/**
 * Create / edit a device via the existing `createDevice` / `updateDevice`
 * server actions (unchanged). `device == null` => create.
 *
 * Owner rules mirror the server's `assertOwnsOrAdmin`: only an admin may pick an
 * arbitrary owner; everyone else is locked to their own member. On edit the
 * owner is shown read-only because `updateDevice` cannot reassign ownership.
 *
 * Mounted fresh per open (the parent renders it conditionally), so form state is
 * seeded once from `device` via the `useState` initializer — no reset effect.
 */
export function DeviceFormDialog({
  device,
  onClose,
  onSaved,
}: {
  device?: Device | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const store = useAppStore();
  const isAdmin = store.role === "admin";
  const editing = !!device;

  const [form, setForm] = useState<FormState>(() =>
    device
      ? {
          name: device.name,
          type: device.type,
          inventoryNumber: device.inventoryNumber,
          mac: device.mac ?? "",
          ownerMemberId: device.ownerMemberId,
        }
      : blank(store.currentUser.id),
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof FormState>(key: K) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => setForm((f) => ({ ...f, [key]: e.target.value as FormState[K] }));

  const ownerName = store.memberById(form.ownerMemberId)?.name ?? "—";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const name = form.name.trim();
    const inventoryNumber = form.inventoryNumber.trim();
    const mac = form.mac.trim();

    // Client-side required-field validation (same hand-rolled pattern as
    // NewRoomDialog); the server re-validates via Zod as the source of truth.
    if (!name || !form.type || !inventoryNumber) {
      setError("Name, type and inventory number are required.");
      return;
    }
    if (!editing && !form.ownerMemberId) {
      setError("Pick an owner for this device.");
      return;
    }

    setSubmitting(true);
    try {
      if (editing) {
        await updateDevice(device!.id, { name, type: form.type, inventoryNumber, mac: mac || null });
      } else {
        // Created straight into inventory (no seat) as SECONDARY — placement
        // stays out of this form's scope. `role` is passed explicitly because
        // the action's input type (a Zod output type) requires it.
        await createDevice({
          name,
          type: form.type,
          inventoryNumber,
          mac: mac || null,
          ownerMemberId: form.ownerMemberId,
          role: "SECONDARY",
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That action failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <EntityFormDialog
      open
      title={editing ? "Edit device" : "New device"}
      subtitle={
        editing
          ? "Update this device's details. Owner can't be changed here."
          : "Adds a device to inventory. Place it on a seat later from the seat panel."
      }
      submitLabel={editing ? "Save changes" : "Create device"}
      submitting={submitting}
      error={error}
      onClose={onClose}
      onSubmit={handleSubmit}
    >
      <DialogField label="Name" icon="devices" value={form.name} onChange={set("name")} placeholder='MacBook Pro 14"' />

      <div className="grid grid-cols-2 gap-3">
        <DialogSelect label="Type" icon="category" value={form.type} onChange={set("type")}>
          {DEVICE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </DialogSelect>
        <DialogField
          label="Inventory number"
          icon="tag"
          value={form.inventoryNumber}
          onChange={set("inventoryNumber")}
          placeholder="INV-40021"
        />
      </div>

      <DialogField
        label="MAC (optional)"
        icon="lan"
        value={form.mac}
        onChange={set("mac")}
        placeholder="A4:83:E7:11:22:01"
      />

      {editing ? (
        <DialogField label="Owner" icon="person" value={ownerName} disabled readOnly />
      ) : isAdmin ? (
        <DialogSelect label="Owner" icon="person" value={form.ownerMemberId} onChange={set("ownerMemberId")}>
          {store.members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
              {m.employeeCode ? ` · ${m.employeeCode}` : ""}
            </option>
          ))}
        </DialogSelect>
      ) : (
        // Non-admins can only own their own devices (server-enforced), so the
        // owner is fixed to the current member and shown read-only.
        <DialogField label="Owner" icon="person" value={ownerName} disabled readOnly />
      )}
    </EntityFormDialog>
  );
}

function blank(ownerMemberId: string): FormState {
  return { name: "", type: DEVICE_TYPES[0], inventoryNumber: "", mac: "", ownerMemberId };
}
