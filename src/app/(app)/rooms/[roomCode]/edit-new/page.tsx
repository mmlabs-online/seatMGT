import { redirect } from "next/navigation";

/**
 * Compatibility redirect. The free-form editor used to live at `edit-new` (the
 * "beta" route); it's now the primary editor at `../edit`. This keeps any old
 * links/bookmarks working. Safe to delete once no stale links remain.
 */
export default async function EditNewRedirect({
  params,
}: {
  params: Promise<{ roomCode: string }>;
}) {
  const { roomCode } = await params;
  redirect(`/rooms/${roomCode}/edit`);
}
