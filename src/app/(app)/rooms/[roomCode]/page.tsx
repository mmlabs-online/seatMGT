import { Suspense } from "react";
import Link from "next/link";
import { getRoom } from "@/lib/data";
import { getRoomLayout } from "@/lib/data/roomLayout";
import { RoomView } from "@/components/roomlayout/RoomView";

/**
 * Primary room viewer. Server-fetches the FREE-FORM layout (the same source the
 * primary editor writes) so the view never drifts from what's edited, then
 * renders the read-only `RoomView`. The legacy grid viewer/editor is archived
 * at `./edit-legacy`.
 */
export default async function RoomPage({
  params,
}: {
  params: Promise<{ roomCode: string }>;
}) {
  const { roomCode } = await params;
  const room = await getRoom(roomCode);
  const layout = room ? await getRoomLayout(room.id) : null;

  if (!room || !layout) {
    return (
      <div className="p-8">
        <p className="text-on-surface-variant font-semibold">
          Room <b>{roomCode}</b> not found.{" "}
          <Link href="/rooms" className="text-primary underline">
            Back to rooms
          </Link>
        </p>
      </div>
    );
  }

  // RoomView reads the ?seat= search param (via SeatDetailPanel), so it must sit
  // under Suspense.
  return (
    <Suspense fallback={null}>
      <RoomView layout={layout} />
    </Suspense>
  );
}
