import { prisma } from "@/lib/db";
import { requireRolePage } from "@/lib/auth/session";
import { approveRequest, rejectRequest } from "@/lib/actions/requests";
import { Card, Icon, Button, Avatar } from "@/components/ui";

export default async function ApprovalsPage() {
  await requireRolePage("manager");

  const requests = await prisma.seatRequest.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: {
      subject: { include: { account: true } },
      createdBy: true,
      seat: { include: { room: true } },
    },
  });

  return (
    <div className="relative px-6 md:px-7 pt-7 pb-12 max-w-[900px] mx-auto">
      <h1 className="m-0 mb-1 text-[28px] font-extrabold tracking-[-0.01em] text-on-surface">
        Approvals
      </h1>
      <p className="m-0 mb-6 text-sm text-on-surface-variant">
        {requests.length} pending seat request{requests.length === 1 ? "" : "s"}.
      </p>

      {requests.length === 0 ? (
        <Card className="p-8 flex items-center gap-3 text-on-surface-variant">
          <Icon name="fact_check" size={22} />
          <span className="text-sm font-semibold">Nothing waiting on you right now.</span>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {requests.map((r) => (
            <Card key={r.id} className="p-4 flex items-center gap-3.5 flex-wrap">
              <Avatar name={r.subject.name} size={44} />
              <div className="flex-1 min-w-[180px]">
                <div className="text-sm font-bold text-on-surface">{r.subject.name}</div>
                <div className="text-xs text-on-surface-variant font-semibold">
                  wants <span className="font-mono">{r.seat.code}</span> · {r.seat.room.name}
                  {r.createdBy.id !== r.subject.id ? ` · requested by ${r.createdBy.name}` : ""}
                </div>
              </div>
              <form action={approveRequest.bind(null, r.id)}>
                <Button type="submit" icon="check" size="sm">
                  Approve
                </Button>
              </form>
              <form action={rejectRequest.bind(null, r.id)}>
                <Button type="submit" icon="close" variant="danger" size="sm">
                  Reject
                </Button>
              </form>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
