import type { Group, Member } from "@/types";
import { Avatar, Icon, RoleBadge } from "@/components/ui";

/** Member card — avatar, name, role pill, group, seat & device counts. */
export function MemberCard({
  member,
  group,
  seatCount,
  deviceCount,
}: {
  member: Member;
  group?: Group;
  seatCount: number;
  deviceCount: number;
}) {
  return (
    <div className="flex items-center gap-3.5 border border-outline-variant bg-surface-low rounded-md3-lg p-[14px_16px] shadow-[var(--card-shadow)] hover:border-outline hover:shadow-[var(--card-shadow-hover)] transition-[box-shadow,border-color]">
      <Avatar name={member.name} color={group?.color} size={46} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-bold text-on-surface truncate">{member.name}</span>
          <RoleBadge role={member.role} />
        </div>
        <div className="text-xs text-on-surface-variant font-semibold mt-0.5">
          <span className="font-mono tracking-[0.02em]">{member.employeeCode}</span> · {group?.name ?? "—"}
        </div>
        <div className="flex gap-3.5 mt-2">
          <span className="flex items-center gap-1.5 text-xs font-bold text-on-surface">
            <Icon name="chair" size={16} className="text-on-surface-variant" />
            {seatCount} seat{seatCount === 1 ? "" : "s"}
          </span>
          <span className="flex items-center gap-1.5 text-xs font-bold text-on-surface">
            <Icon name="lan" size={16} className="text-on-surface-variant" />
            {deviceCount} device{deviceCount === 1 ? "" : "s"}
          </span>
        </div>
      </div>
    </div>
  );
}
