import { Suspense } from "react";
import { requireRolePage } from "@/lib/auth/session";
import { RoomLayoutView } from "@/components/seatmap/_legacy/RoomLayoutView";

/**
 * ARCHIVED legacy grid/arrange editor (Admin-only). Kept reachable for recovery
 * only — NOTHING in the active UI links here. The primary editor is the
 * free-form one at `../edit`. See `src/components/seatmap/_legacy/README.md`.
 */
export default async function LegacyRoomEditorPage({
  params,
}: {
  params: Promise<{ roomCode: string }>;
}) {
  await requireRolePage("admin");
  const { roomCode } = await params;
  // RoomLayoutView reads the ?seat= search param, so it must sit under Suspense.
  return (
    <Suspense fallback={null}>
      <RoomLayoutView roomCode={roomCode} />
    </Suspense>
  );
}
