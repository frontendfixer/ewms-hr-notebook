"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { adjustLeaveBalances } from "@/actions/events";
import { SubmitButton } from "@/components/ui/submit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { toastResult } from "@/lib/action-toast";
import { formatDate } from "@/lib/utils";
import { Award, ChevronRight, Palmtree, Plus } from "lucide-react";

type ManageLeavesViewProps = {
  balances: {
    crBalance: number;
    clBalance: number;
    lapBalance: number;
    lhapBalance: number;
    leaveBalance: number;
  };
  /** Credits still usable, soonest expiry first. */
  crCredits: { creditEventId: string; balance: number; expiresAt: Date | null; earnedAt: Date | null }[];
};

export function ManageLeavesView({ balances, crCredits }: ManageLeavesViewProps) {
  const router = useRouter();

  return (
    <div className="mx-auto min-w-0 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Manage Leaves</h1>
        <p className="text-sm text-muted-foreground">
          View balances and update opening leave counts
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">CR</p>
            <p className="text-lg font-bold">{balances.crBalance}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">CL</p>
            <p className="text-lg font-bold">{balances.clBalance}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">LAP</p>
            <p className="text-lg font-bold">{balances.lapBalance}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">LHAP</p>
            <p className="text-lg font-bold">{balances.lhapBalance}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Link href="/add/leave">
          <Card className="transition-shadow hover:shadow-sm">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Palmtree className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">Take Leave</p>
                <p className="text-xs text-muted-foreground">Record a new leave</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/add/cr">
          <Card className="transition-shadow hover:shadow-sm">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Award className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">Add CR</p>
                <p className="text-xs text-muted-foreground">Earn compensatory rest</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Update leave balances</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Set your current CL, LAP and LHAP balances as shown in HRMS. Use this
            to correct differences; the balances you enter are taken as on today
            and automatic credits continue from here.
          </p>
          <form
            action={async (fd) => {
              const result = await adjustLeaveBalances(fd);
              if (toastResult(result, "Leave balances updated")) router.refresh();
            }}
            className="space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="clBalance">CL balance (days)</Label>
                <Input
                  id="clBalance"
                  name="clBalance"
                  type="number"
                  step="0.5"
                  min="0"
                  defaultValue={balances.clBalance}
                  required
                />
              </div>
              <div>
                <Label htmlFor="lapBalance">LAP balance (days)</Label>
                <Input
                  id="lapBalance"
                  name="lapBalance"
                  type="number"
                  step="0.5"
                  min="0"
                  defaultValue={balances.lapBalance}
                  required
                />
              </div>
              <div>
                <Label htmlFor="lhapBalance">LHAP balance (days)</Label>
                <Input
                  id="lhapBalance"
                  name="lhapBalance"
                  type="number"
                  step="0.5"
                  min="0"
                  defaultValue={balances.lhapBalance}
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="adjust-reason">Reason (optional)</Label>
              <Textarea
                id="adjust-reason"
                name="reason"
                rows={2}
                placeholder="e.g. Annual credit, correction after audit"
              />
            </div>
            <SubmitButton className="w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              Save balances
            </SubmitButton>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Available CR credits</CardTitle>
        </CardHeader>
        <CardContent>
          {crCredits.length === 0 ? (
            <p className="text-sm text-muted-foreground">None right now.</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {crCredits.map((c) => (
                <li
                  key={c.creditEventId}
                  className="flex items-center justify-between gap-3 py-2 text-sm first:pt-0 last:pb-0"
                >
                  <span>
                    {Math.round(c.balance * 100) / 100} day
                    {c.balance === 1 ? "" : "s"}
                    {c.earnedAt && (
                      <span className="text-muted-foreground"> · earned {formatDate(c.earnedAt)}</span>
                    )}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {c.expiresAt ? `expires ${formatDate(c.expiresAt)}` : "no expiry"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2 text-sm">
        <Link href="/timeline?filter=LEAVE" className="text-primary hover:underline">
          View leave records
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href="/timeline?filter=CR" className="text-primary hover:underline">
          View CR records
        </Link>
      </div>
    </div>
  );
}
