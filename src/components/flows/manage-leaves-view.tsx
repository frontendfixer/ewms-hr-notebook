"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { adjustLeaveBalances } from "@/actions/events";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { toast } from "sonner";
import { Award, ChevronRight, Palmtree, Plus } from "lucide-react";

type ManageLeavesViewProps = {
  balances: {
    crBalance: number;
    clBalance: number;
    lapBalance: number;
    lhapBalance: number;
    leaveBalance: number;
  };
};

export function ManageLeavesView({ balances }: ManageLeavesViewProps) {
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
            Set your current CL, LAP, and LHAP balances. Only these three types
            deduct from your leave balance when you take leave. CR is managed
            separately through holiday work.
          </p>
          <form
            action={async (fd) => {
              try {
                await adjustLeaveBalances(fd);
                toast.success("Leave balances updated");
                router.refresh();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Failed");
              }
            }}
            className="space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label>CL balance (days)</Label>
                <Input
                  name="clBalance"
                  type="number"
                  step="0.5"
                  min="0"
                  defaultValue={balances.clBalance}
                  required
                />
              </div>
              <div>
                <Label>LAP balance (days)</Label>
                <Input
                  name="lapBalance"
                  type="number"
                  step="0.5"
                  min="0"
                  defaultValue={balances.lapBalance}
                  required
                />
              </div>
              <div>
                <Label>LHAP balance (days)</Label>
                <Input
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
              <Label>Reason (optional)</Label>
              <Textarea
                name="reason"
                rows={2}
                placeholder="e.g. Annual credit, correction after audit"
              />
            </div>
            <Button type="submit" className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Save balances
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2 text-sm">
        <Link href="/records/leave" className="text-primary hover:underline">
          View leave records
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href="/records/cr" className="text-primary hover:underline">
          View CR records
        </Link>
      </div>
    </div>
  );
}
