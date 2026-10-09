import { groupColor } from "@/lib/schema";

// Small coloured "G1" pill used everywhere a group is shown.
export function GroupBadge({ group, className = "" }: { group: string; className?: string }) {
  const c = groupColor(group);
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${className}`}
      style={{ background: c.bg, color: c.fg }}
    >
      G{group}
    </span>
  );
}

export function GroupDot({ group, className = "h-2.5 w-2.5" }: { group: string; className?: string }) {
  return <span className={`inline-block shrink-0 rounded-full ${className}`} style={{ background: groupColor(group).bg }} />;
}
