"use client";

import { useEffect, useState } from "react";
import type { Member } from "@/types";
import { useAppStore } from "@/store/AppStore";
import { searchMembers } from "@/lib/data/search";
import { FilledInput } from "@/components/ui";
import { MemberCard } from "@/components/members/MemberCard";

export default function MembersPage() {
  const store = useAppStore();
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<Member[]>(store.members);

  useEffect(() => {
    let cancelled = false;
    const handle = setTimeout(async () => {
      const results = await searchMembers(query);
      if (!cancelled) setRows(results);
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query]);

  return (
    <div className="relative px-6 md:px-7 pt-7 pb-12 max-w-[1120px] mx-auto">
      <div className="blob w-72 h-72 -top-16 right-10" style={{ background: "var(--accent-orange)", opacity: 0.06 }} aria-hidden />
      <h1 className="m-0 mb-1 text-[28px] font-extrabold tracking-[-0.01em] text-on-surface">Members</h1>
      <p className="m-0 mb-6 text-sm text-on-surface-variant">
        {store.members.length} people · seats occupied and devices owned.
      </p>

      <div className="mb-4 max-w-md">
        <FilledInput
          aria-label="Search members"
          placeholder="Search name or employee code…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3.5">
        {rows.map((m) => (
          <MemberCard
            key={m.id}
            member={m}
            group={store.groupById(m.groupId)}
            seatCount={store.seatsOccupiedBy(m.id)}
            deviceCount={store.devicesOwnedBy(m.id)}
          />
        ))}
      </div>
    </div>
  );
}
