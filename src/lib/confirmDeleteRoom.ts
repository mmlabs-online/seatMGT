import { deleteRoom, getRoomDeleteImpact } from "@/lib/actions/rooms";

/**
 * Shared "delete room" interaction for the Rooms list and the room detail
 * view: checks what deleting the room would affect, confirms accordingly
 * (a plain confirm if the room is already empty, a stronger one naming the
 * occupants/devices if not), then deletes — forcing the bulk cleanup only
 * when the admin explicitly agreed to it. Returns whether the room was
 * actually deleted, so callers can navigate away on success.
 */
export async function confirmAndDeleteRoom(roomId: string, roomCode: string): Promise<boolean> {
  const { occupiedCount, deviceCount } = await getRoomDeleteImpact(roomId);
  const hasOccupantsOrDevices = occupiedCount > 0 || deviceCount > 0;

  const message = hasOccupantsOrDevices
    ? `Room ${roomCode} has ${occupiedCount} occupied seat${occupiedCount === 1 ? "" : "s"} and ${deviceCount} device${deviceCount === 1 ? "" : "s"} placed. Deleting it will remove all occupants and unplace all devices from their seats. Continue?`
    : `Delete room ${roomCode}? This can't be undone.`;

  if (!window.confirm(message)) return false;

  try {
    await deleteRoom(roomId, hasOccupantsOrDevices);
    return true;
  } catch (err) {
    window.alert(err instanceof Error ? err.message : "That action failed.");
    return false;
  }
}
