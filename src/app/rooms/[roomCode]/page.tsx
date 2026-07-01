"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { RoomLayoutView } from "@/components/seatmap/RoomLayoutView";

export default function RoomPage() {
  const { roomCode } = useParams<{ roomCode: string }>();
  // RoomLayoutView reads the ?seat= search param, so it must sit under Suspense.
  return (
    <Suspense fallback={null}>
      <RoomLayoutView roomCode={roomCode} />
    </Suspense>
  );
}
