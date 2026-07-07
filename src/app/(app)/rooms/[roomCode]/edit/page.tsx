import Link from "next/link";
import { getRoom } from "@/lib/data";
import { getRoomLayout } from "@/lib/data/roomLayout";
import { requireRolePage } from "@/lib/auth/session";
import { LayoutEditor } from "@/components/roomlayout/LayoutEditor";

/**
 * Room Layout Editor — the PRIMARY free-form layout editor (Admin-only). This
 * is the canonical arrange route: the room viewer's "Arrange" action points
 * here. The previous grid/arrange editor is archived at `./edit-legacy`.
 */
export default async function EditRoomLayoutPage({
  params,
}: {
  params: Promise<{ roomCode: string }>;
}) {
  await requireRolePage("admin");
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

  return <LayoutEditor initial={layout} />;
}
