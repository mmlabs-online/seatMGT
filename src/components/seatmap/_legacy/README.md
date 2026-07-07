# Archived: legacy room layout editor

**Archived:** 2026-07-05

`RoomLayoutView.tsx` here is the original **grid / in-place arrange** room editor
(and room viewer). It was superseded by the **free-form** editor
(`src/components/roomlayout/LayoutEditor.tsx`), which is now the primary editor
at `/rooms/[roomCode]/edit`, and by the free-form read-only viewer
(`src/components/roomlayout/RoomView.tsx`) at `/rooms/[roomCode]`.

## Status
- **Not linked from anywhere in the active UI.**
- Still compiles and works if visited directly at **`/rooms/[roomCode]/edit-legacy`**
  (Admin-only), rendered by `src/app/(app)/rooms/[roomCode]/edit-legacy/page.tsx`.
- Reads the original editor's own data: `Seat.posX/posY` (positions) and
  `Room.layoutMeta.features` (Door/Window). It writes them via the legacy server
  actions in `src/lib/actions/rooms.ts` (marked `@deprecated`), which are still
  fully functional.

## Data
No data was dropped. The legacy positional fields (`Seat.posX/posY`, `Seat.col/row`)
and `Room.layoutMeta.features` are all retained. The free-form editor's coordinates
were **backfilled** from `posX/posY` (migration
`20260705..._backfill_seat_freeform_xy`), so both editors show the same arrangement.

## How to restore it as the primary room view
1. In `src/app/(app)/rooms/[roomCode]/page.tsx`, import from
   `@/components/seatmap/_legacy/RoomLayoutView` instead of
   `@/components/roomlayout/RoomView`, and render `<RoomLayoutView roomCode={...} />`
   (it's a client component — wrap in `<Suspense>` as the original did).
2. (Optional) delete/redirect `/rooms/[roomCode]/edit` and remove the "Arrange"
   link, or leave both editors available side by side.
3. Un-deprecate the legacy actions in `src/lib/actions/rooms.ts` if desired.

Nothing else references this folder, so restoring is a one-file change to the room
page.
