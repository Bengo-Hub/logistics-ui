"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button, Input } from "@/components/ui/base";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useConfirmDelivery, useOverrideDelivery } from "@/hooks/use-tasks";
import { apiErrorText } from "@/lib/utils";
import type { Task } from "@/types/logistics";

/** M-Pesa confirmation codes are 10 letters and digits (e.g. SGH7K2L9QP). */
const MPESA_CODE = /^[A-Z0-9]{10}$/;

interface CloseDeliveryDialogProps {
  task: Task;
  /**
   * "confirm": a dispatcher enters the customer's code for the rider (logistics-api checks it).
   * "override": an admin marks it delivered without the code, giving a reason.
   */
  mode: "confirm" | "override";
  onClose: () => void;
}

/** Closes a delivery from the dashboard. Both paths emit the same delivered event as the rider app. */
export function CloseDeliveryDialog({ task, mode, onClose }: CloseDeliveryDialogProps) {
  const confirmMutation = useConfirmDelivery();
  const overrideMutation = useOverrideDelivery();
  const codAmount = task.cash_on_delivery || 0;
  const isCOD = codAmount > 0;
  const codeRequired = mode === "confirm" && task.pod_code_required !== false;

  const [code, setCode] = useState("");
  const [recipient, setRecipient] = useState(task.customer_name || "");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [amount, setAmount] = useState(isCOD ? String(codAmount) : "");
  const [method, setMethod] = useState<"cash" | "mpesa">("cash");
  const [mpesaCode, setMpesaCode] = useState("");

  const pending = confirmMutation.isPending || overrideMutation.isPending;
  const codReady =
    !isCOD || (Number(amount) >= codAmount && (method !== "mpesa" || MPESA_CODE.test(mpesaCode)));
  const ready =
    codReady &&
    (mode === "override"
      ? reason.trim().length > 0
      : recipient.trim().length > 0 && (!codeRequired || code.length === 6));

  const payment = isCOD
    ? {
        amount_collected: Number(amount),
        collection_method: method,
        ...(method === "mpesa" ? { collection_reference: mpesaCode } : {}),
      }
    : {};

  const submit = () => {
    const done = {
      onSuccess: () => {
        toast.success(mode === "override" ? "Marked delivered (override)" : "Delivery confirmed");
        onClose();
      },
      onError: (err: unknown) => toast.error(apiErrorText(err, "Could not close the delivery")),
    };
    if (mode === "override") {
      overrideMutation.mutate(
        {
          taskId: task.id,
          body: { reason: reason.trim(), recipient_name: recipient.trim() || undefined, notes: notes.trim() || undefined, ...payment },
        },
        done
      );
    } else {
      confirmMutation.mutate(
        {
          taskId: task.id,
          body: {
            ...(codeRequired ? { confirmation_code: code } : {}),
            recipient_name: recipient.trim(),
            notes: notes.trim() || undefined,
            ...payment,
          },
        },
        done
      );
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "override" ? "Mark delivered (override)" : "Confirm delivery"}</DialogTitle>
          <DialogDescription>
            {mode === "override"
              ? "Closes the delivery without the customer's code. Use it only when you are sure the order reached the customer. Your name, the time and the reason are kept on the delivery."
              : codeRequired
                ? "Call the customer for the 6-digit delivery code on their order page and enter it here. Use this when the rider cannot complete it from the rider app."
                : "Record who received the order for the rider."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {codeRequired && (
            <div>
              <label className="text-sm font-medium" htmlFor="pod-code">
                Customer&apos;s delivery code
              </label>
              <Input
                id="pod-code"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="6-digit code"
                className="mt-1 font-mono tracking-[0.4em]"
              />
            </div>
          )}

          {mode === "override" && (
            <div>
              <label className="text-sm font-medium" htmlFor="override-reason">
                Reason (required)
              </label>
              <textarea
                id="override-reason"
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. customer lost the code, confirmed receipt by phone"
                className="mt-1 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}

          <div>
            <label className="text-sm font-medium" htmlFor="pod-recipient">
              Who received the order{mode === "confirm" ? "" : " (optional)"}
            </label>
            <Input
              id="pod-recipient"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="mt-1"
            />
          </div>

          {isCOD && (
            <div className="space-y-2 rounded-lg border border-warning/40 p-3">
              <p className="text-sm font-medium">
                Pay on delivery: KES {codAmount.toLocaleString()} due at the door
              </p>
              <div className="flex gap-2">
                {(["cash", "mpesa"] as const).map((m) => (
                  <Button
                    key={m}
                    type="button"
                    size="sm"
                    variant={method === m ? "default" : "outline"}
                    onClick={() => setMethod(m)}
                  >
                    {m === "cash" ? "Cash" : "M-Pesa"}
                  </Button>
                ))}
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground" htmlFor="pod-amount">
                  Amount the rider took
                </label>
                <Input
                  id="pod-amount"
                  type="number"
                  min={0}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="mt-1"
                />
              </div>
              {method === "mpesa" && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground" htmlFor="pod-mpesa">
                    M-Pesa code
                  </label>
                  <Input
                    id="pod-mpesa"
                    value={mpesaCode}
                    onChange={(e) => setMpesaCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10))}
                    placeholder="e.g. SGH7K2L9QP"
                    className="mt-1 font-mono"
                  />
                </div>
              )}
              {method === "cash" && (
                <p className="text-xs text-muted-foreground">
                  The cash stays with the rider until it is handed in on the Cash page.
                </p>
              )}
            </div>
          )}

          <div>
            <label className="text-sm font-medium" htmlFor="pod-notes">
              Notes (optional)
            </label>
            <Input id="pod-notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Back
          </Button>
          <Button onClick={submit} disabled={!ready || pending} variant={mode === "override" ? "destructive" : "default"}>
            {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {mode === "override" ? "Mark delivered" : "Confirm delivery"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
