"use client";

import { useState } from "react";
import { toast } from "sonner";
import { isAxiosError } from "axios";
import { Banknote, Loader2, Phone, RefreshCw } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input } from "@/components/ui/base";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCashWithRiders, useRecordRemittance, type RiderCash } from "@/hooks/use-rider-cash";
import { useHasPermission } from "@/hooks/useMe";

// Cash on delivery riders are carrying. The outlet counts what a rider hands in and records it
// here; everything they held is closed in one hand-in, and any shortfall is kept on the record.

function money(amount: number) {
  return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function since(iso?: string) {
  if (!iso) return "";
  const hrs = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (hrs < 1) return "under an hour";
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function errorText(err: unknown, fallback: string) {
  if (isAxiosError(err) && typeof err.response?.data === "string" && err.response.data.trim()) {
    return err.response.data.trim();
  }
  return err instanceof Error ? err.message : fallback;
}

export default function RiderCashPage() {
  const { data, isLoading, refetch, isRefetching } = useCashWithRiders();
  // The backend enforces logistics.tasks.manage; hide the action from users without it.
  const canRecord = useHasPermission("logistics.tasks.manage");
  const [selected, setSelected] = useState<RiderCash | null>(null);
  const riders = data?.data ?? [];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Rider cash</h1>
          <p className="text-sm text-muted-foreground">
            Cash on delivery your riders are carrying. Count it when they hand it in and record it here.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
          <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <Card>
        <CardContent className="flex items-center gap-4 py-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15">
            <Banknote className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">With riders now</p>
            <p className="text-2xl font-bold">{money(data?.total_held ?? 0)}</p>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : riders.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">No rider is holding delivery cash.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {riders.map((rc) => (
            <Card key={rc.fleet_member_id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between gap-2 text-base">
                  <span className="truncate">{rc.rider_name || "Rider"}</span>
                  <span className="font-bold">{money(rc.held)}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary">
                    {rc.deliveries.length} deliver{rc.deliveries.length === 1 ? "y" : "ies"}
                  </Badge>
                  {rc.oldest_at && <span>oldest {since(rc.oldest_at)} ago</span>}
                  {rc.rider_phone && (
                    <a href={`tel:${rc.rider_phone}`} className="flex items-center gap-1 text-primary">
                      <Phone className="h-3 w-3" /> {rc.rider_phone}
                    </a>
                  )}
                </div>
                <ul className="max-h-32 space-y-1 overflow-y-auto text-sm">
                  {rc.deliveries.map((d) => (
                    <li key={d.pod_id} className="flex justify-between gap-2">
                      <span className="truncate">{d.order_number || d.task_id.slice(0, 8)}</span>
                      <span className="tabular-nums">{money(d.amount)}</span>
                    </li>
                  ))}
                </ul>
                {canRecord && (
                  <Button className="w-full" onClick={() => setSelected(rc)}>
                    Record hand-in
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selected && <RemitDialog rider={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function RemitDialog({ rider, onClose }: { rider: RiderCash; onClose: () => void }) {
  const record = useRecordRemittance();
  const [amount, setAmount] = useState(String(rider.held));
  const [notes, setNotes] = useState("");
  const received = Number(amount);
  const valid = amount.trim() !== "" && Number.isFinite(received) && received >= 0;
  const short = valid ? Math.max(0, rider.held - received) : 0;

  const submit = () => {
    record.mutate(
      { memberId: rider.fleet_member_id, amountReceived: received, notes: notes.trim() || undefined },
      {
        onSuccess: (rem) => {
          if (rem.shortfall > 0) {
            toast.warning(`Hand-in recorded, ${money(rem.shortfall)} short`);
          } else {
            toast.success("Hand-in recorded");
          }
          onClose();
        },
        onError: (err) => toast.error(errorText(err, "Could not record the hand-in")),
      },
    );
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cash from {rider.rider_name || "rider"}</DialogTitle>
          <DialogDescription>
            Expected {money(rider.held)} from {rider.deliveries.length} cash deliver
            {rider.deliveries.length === 1 ? "y" : "ies"}. Enter what you counted.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold uppercase text-muted-foreground">Amount received</label>
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1"
            />
            {short > 0.004 && (
              <p className="mt-1 text-xs font-semibold text-amber-600">{money(short)} short. It stays on the record.</p>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-muted-foreground">Notes (optional)</label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. paid shortfall by M-Pesa" className="mt-1" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!valid || record.isPending}>
            {record.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Record {valid ? money(received) : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
