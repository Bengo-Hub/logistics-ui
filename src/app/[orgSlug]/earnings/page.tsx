"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import {
  Banknote,
  CalendarPlus,
  CircleDollarSign,
  Clock,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Wallet,
} from "lucide-react";
import { Badge, Button, Card, CardContent, Input } from "@/components/ui/base";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PermissionGate } from "@/components/ui/module-gate";
import { useFleetMembers } from "@/hooks/use-fleet";
import {
  useBillingEvents,
  useCreatePricingRule,
  useDeletePricingRule,
  useEarningStatements,
  useGenerateStatements,
  usePricingRules,
  useSettleStatement,
  useUpdatePricingRule,
  type EarningStatement,
  type PricingRule,
} from "@/hooks/use-earnings";
import { useMyPermissions } from "@/hooks/use-module-access";
import { apiErrorText, orgRoute } from "@/lib/utils";
import { SubscriptionGate } from "@/components/subscription/subscription-gate";
import { FeatureLock } from "@bengo-hub/shared-ui-lib/subscription";

// Freelance riders earn per delivery: the delivery fee on the order, or these pay rules when the
// order carries none. Statements are made every day for the day before; paying one sends the
// money through treasury to the rider's payout method. Staff riders are paid by HR payroll.

type Tab = "statements" | "rules" | "activity";

const TABS: { value: Tab; label: string }[] = [
  { value: "statements", label: "Statements" },
  { value: "rules", label: "Pay rules" },
  { value: "activity", label: "Earnings log" },
];

const STATEMENT_STATUS: Record<
  string,
  { label: string; tone: "warning" | "secondary" | "success" }
> = {
  draft: { label: "To pay", tone: "warning" },
  confirmed: { label: "To pay", tone: "warning" },
  processing: { label: "Being paid", tone: "secondary" },
  paid: { label: "Paid", tone: "success" },
};

const kes = (n: number) =>
  `KES ${n.toLocaleString("en-KE", { maximumFractionDigits: 2 })}`;
const dayLabel = (s: string) =>
  new Date(s).toLocaleDateString("en-KE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

function yesterday() {
  const d = new Date(Date.now() - 86_400_000);
  return d.toISOString().slice(0, 10);
}

type RuleForm = {
  name: string;
  rule_type: "flat" | "distance";
  base_fee: number;
  per_km_rate: number;
  surge_multiplier: number;
  priority: number;
  is_active: boolean;
};
const EMPTY_RULE: RuleForm = {
  name: "",
  rule_type: "distance",
  base_fee: 0,
  per_km_rate: 0,
  surge_multiplier: 1,
  priority: 0,
  is_active: true,
};

function RuleDialog({
  rule,
  open,
  onClose,
}: {
  rule: PricingRule | null;
  open: boolean;
  onClose: () => void;
}) {
  const create = useCreatePricingRule();
  const update = useUpdatePricingRule();
  const [form, setForm] = useState<RuleForm>(EMPTY_RULE);
  const [loadedFor, setLoadedFor] = useState<string | null | undefined>(
    undefined,
  );
  // Load the rule once each time the dialog opens for it.
  if (open && loadedFor !== (rule?.id ?? null)) {
    setLoadedFor(rule?.id ?? null);
    setForm(
      rule
        ? {
            name: rule.name,
            rule_type: rule.rule_type === "flat" ? "flat" : "distance",
            base_fee: rule.base_fee,
            per_km_rate: rule.per_km_rate ?? 0,
            surge_multiplier: rule.surge_multiplier ?? 1,
            priority: rule.priority,
            is_active: rule.is_active,
          }
        : EMPTY_RULE,
    );
  }
  const close = () => {
    setLoadedFor(undefined);
    onClose();
  };
  const set = <K extends keyof RuleForm>(k: K, v: RuleForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));
  const busy = create.isPending || update.isPending;
  const sample =
    form.base_fee + (form.rule_type === "distance" ? form.per_km_rate * 5 : 0);

  const save = () => {
    const body = {
      ...form,
      per_km_rate: form.rule_type === "distance" ? form.per_km_rate : 0,
    };
    const opts = {
      onSuccess: () => {
        toast.success(rule ? "Pay rule saved" : "Pay rule added");
        close();
      },
      onError: (err: unknown) =>
        toast.error(apiErrorText(err, "Could not save the pay rule")),
    };
    if (rule) update.mutate({ ruleId: rule.id, ...body }, opts);
    else create.mutate(body, opts);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{rule ? "Edit pay rule" : "New pay rule"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <label className="block text-sm font-medium">
            Name
            <Input
              className="mt-1"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Standard town rate"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(["distance", "flat"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => set("rule_type", t)}
                className={`rounded-lg border p-3 text-left text-sm ${form.rule_type === t ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"}`}
              >
                <p className="font-medium">
                  {t === "distance" ? "Base plus per km" : "Fixed amount"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t === "distance"
                    ? "Pay grows with the trip"
                    : "Same pay for every trip"}
                </p>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-medium">
              {form.rule_type === "flat" ? "Amount (KES)" : "Base (KES)"}
              <Input
                className="mt-1"
                type="number"
                min={0}
                value={form.base_fee}
                onChange={(e) => set("base_fee", Number(e.target.value) || 0)}
              />
            </label>
            {form.rule_type === "distance" && (
              <label className="text-sm font-medium">
                Per km (KES)
                <Input
                  className="mt-1"
                  type="number"
                  min={0}
                  step={0.5}
                  value={form.per_km_rate}
                  onChange={(e) =>
                    set("per_km_rate", Number(e.target.value) || 0)
                  }
                />
              </label>
            )}
            <label className="text-sm font-medium">
              Multiplier
              <Input
                className="mt-1"
                type="number"
                min={0.1}
                step={0.1}
                value={form.surge_multiplier}
                onChange={(e) =>
                  set("surge_multiplier", Number(e.target.value) || 1)
                }
              />
            </label>
            <label className="text-sm font-medium">
              Order
              <Input
                className="mt-1"
                type="number"
                value={form.priority}
                onChange={(e) => set("priority", Number(e.target.value) || 0)}
              />
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            The active rule with the highest order is used. A 5 km trip pays{" "}
            {kes(sample * (form.surge_multiplier || 1))}.
          </p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => set("is_active", e.target.checked)}
            />{" "}
            Active
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!form.name.trim() || busy}>
            {busy ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
            {rule ? "Save" : "Add rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function EarningsPage() {
  const params = useParams();
  const orgSlug = (params?.orgSlug as string) ?? "";
  const [tab, setTab] = useState<Tab>("statements");
  const { hasPermission } = useMyPermissions();
  const canPay = hasPermission("logistics.earnings.manage");

  const {
    data: statements = [],
    isLoading: loadingStmts,
    error: stmtError,
  } = useEarningStatements();
  const { data: events = [], isLoading: loadingEvents } = useBillingEvents();
  const { data: rules = [], isLoading: loadingRules } = usePricingRules();
  const { data: membersData } = useFleetMembers({ limit: 100 });
  const names = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of membersData?.data ?? [])
      m.set(
        r.id,
        `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim() ||
          r.phone ||
          "Rider",
      );
    return m;
  }, [membersData]);
  const riderName = (id?: string) => (id && names.get(id)) || "Rider";

  const generate = useGenerateStatements();
  const settle = useSettleStatement();
  const deleteRule = useDeletePricingRule();
  const [genOpen, setGenOpen] = useState(false);
  const [genDate, setGenDate] = useState(yesterday());
  const [toSettle, setToSettle] = useState<EarningStatement | null>(null);
  const [ruleDialog, setRuleDialog] = useState<{
    open: boolean;
    rule: PricingRule | null;
  }>({ open: false, rule: null });
  const [deleteRuleId, setDeleteRuleId] = useState<string | null>(null);

  const sum = (pred: (s: EarningStatement) => boolean) =>
    statements.filter(pred).reduce((t, s) => t + s.net_amount, 0);
  const toPay = sum((s) => s.status === "draft" || s.status === "confirmed");
  const beingPaid = sum((s) => s.status === "processing");
  const paid = sum((s) => s.status === "paid");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rider earnings</h1>
          <p className="text-sm text-muted-foreground">
            What freelance riders earned and what is still owed. Statements are
            made every morning for the day before.
          </p>
        </div>
        <PermissionGate permission="logistics.earnings.manage">
          <FeatureLock feature="rider_payouts" mode="overlay">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setGenOpen(true)}
            >
              <CalendarPlus className="size-4" /> Make statements for a day
            </Button>
          </FeatureLock>
        </PermissionGate>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {
            label: "To pay",
            value: toPay,
            icon: Wallet,
            cls: "bg-warning/10 text-warning",
          },
          {
            label: "Being paid",
            value: beingPaid,
            icon: Clock,
            cls: "bg-primary/10 text-primary",
          },
          {
            label: "Paid",
            value: paid,
            icon: Banknote,
            cls: "bg-success/10 text-success",
          },
        ].map((c) => (
          <Card key={c.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div
                className={`flex size-10 items-center justify-center rounded-full ${c.cls}`}
              >
                <c.icon className="size-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className="text-lg font-bold">{kes(c.value)}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-1.5 overflow-x-auto">
        {TABS.map((t) => (
          <Button
            key={t.value}
            size="sm"
            className="shrink-0"
            variant={tab === t.value ? "default" : "outline"}
            onClick={() => setTab(t.value)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {tab === "statements" && (
        <SubscriptionGate feature="rider_payouts">
          {loadingStmts ? (
            <div className="flex justify-center py-10">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : stmtError ? (
            <Card className="border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
              {apiErrorText(stmtError, "Could not load statements.")}
            </Card>
          ) : statements.length === 0 ? (
            <Card className="px-6 py-12 text-center text-sm text-muted-foreground">
              No statements yet. They appear the morning after riders complete
              paid deliveries.
            </Card>
          ) : (
            <Card className="divide-y divide-border p-0">
              {statements.map((s) => {
                const st =
                  STATEMENT_STATUS[s.status] ?? STATEMENT_STATUS.draft!;
                const payable = s.status === "draft" && s.net_amount > 0;
                return (
                  <div
                    key={s.id}
                    className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        {riderName(s.fleet_member_id)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {dayLabel(s.period_start)}
                        {s.deduction_amount > 0
                          ? ` · earned ${kes(s.gross_amount)}, less ${kes(s.deduction_amount)}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">{kes(s.net_amount)}</span>
                      <Badge variant={st.tone} className="text-xs">
                        {st.label}
                      </Badge>
                      {canPay && payable && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={settle.isPending}
                          onClick={() => setToSettle(s)}
                        >
                          <CircleDollarSign className="mr-1 size-4" /> Pay
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </Card>
          )}
        </SubscriptionGate>
      )}

      {tab === "rules" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>
              Used when an order carries no delivery fee. What customers pay is
              set in{" "}
              <Link
                href={orgRoute(orgSlug, "/zones")}
                className="font-medium text-primary hover:underline"
              >
                Delivery areas
              </Link>
              .
            </p>
            <PermissionGate permission="logistics.pricing.manage">
              <Button
                size="sm"
                onClick={() => setRuleDialog({ open: true, rule: null })}
              >
                <Plus className="size-4" /> New rule
              </Button>
            </PermissionGate>
          </div>
          {loadingRules ? (
            <div className="flex justify-center py-10">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : rules.length === 0 ? (
            <Card className="px-6 py-12 text-center text-sm text-muted-foreground">
              No pay rules. Riders earn the order&apos;s delivery fee; orders
              without one pay nothing until you add a rule.
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {[...rules]
                .sort((a, b) => b.priority - a.priority)
                .map((rule) => (
                  <Card key={rule.id}>
                    <CardContent className="space-y-2 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold">{rule.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Order {rule.priority}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge
                            variant={rule.is_active ? "success" : "secondary"}
                            className="text-xs"
                          >
                            {rule.is_active ? "Active" : "Off"}
                          </Badge>
                          <PermissionGate permission="logistics.pricing.manage">
                            <Button
                              size="sm"
                              variant="ghost"
                              aria-label="Edit rule"
                              onClick={() =>
                                setRuleDialog({ open: true, rule })
                              }
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              aria-label="Delete rule"
                              onClick={() => setDeleteRuleId(rule.id)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </PermissionGate>
                        </div>
                      </div>
                      <p className="text-sm">
                        {rule.rule_type === "flat"
                          ? `${kes(rule.base_fee)} per trip`
                          : rule.rule_type === "distance"
                            ? `${kes(rule.base_fee)} plus ${kes(rule.per_km_rate ?? 0)} per km`
                            : "This rule type pays nothing on its own. Edit it to a fixed or per km rule."}
                        {rule.surge_multiplier && rule.surge_multiplier !== 1
                          ? `, times ${rule.surge_multiplier}`
                          : ""}
                      </p>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </div>
      )}

      {tab === "activity" &&
        (loadingEvents ? (
          <div className="flex justify-center py-10">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : events.length === 0 ? (
          <Card className="px-6 py-12 text-center text-sm text-muted-foreground">
            No earnings recorded yet.
          </Card>
        ) : (
          <Card className="divide-y divide-border p-0">
            {events.map((ev) => (
              <div
                key={ev.id}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    {riderName(
                      ev.metadata?.fleet_member_id as string | undefined,
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(ev.occurred_at).toLocaleString("en-KE", {
                      day: "numeric",
                      month: "short",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                    {ev.task_id ? (
                      <>
                        {" · "}
                        <Link
                          href={orgRoute(orgSlug, `/tasks/${ev.task_id}`)}
                          className="text-primary hover:underline"
                        >
                          the delivery
                        </Link>
                      </>
                    ) : null}
                  </p>
                </div>
                <span className="font-semibold text-success">
                  +{kes(ev.amount)}
                </span>
              </div>
            ))}
          </Card>
        ))}

      <Dialog open={genOpen} onOpenChange={setGenOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Make statements for a day</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Statements are made every morning for the day before. Use this for a
            day that was missed. Riders who already have a statement for that
            day are skipped.
          </p>
          <Input
            type="date"
            max={yesterday()}
            value={genDate}
            onChange={(e) => setGenDate(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!genDate || generate.isPending}
              onClick={() =>
                generate.mutate(genDate, {
                  onSuccess: () => {
                    toast.success("Statements made");
                    setGenOpen(false);
                  },
                  onError: (err) =>
                    toast.error(
                      apiErrorText(err, "Could not make the statements"),
                    ),
                })
              }
            >
              {generate.isPending ? (
                <Loader2 className="mr-1 size-4 animate-spin" />
              ) : null}
              Make statements
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RuleDialog
        open={ruleDialog.open}
        rule={ruleDialog.rule}
        onClose={() => setRuleDialog({ open: false, rule: null })}
      />

      <ConfirmDialog
        open={!!toSettle}
        onOpenChange={(open) => !open && setToSettle(null)}
        title={
          toSettle
            ? `Pay ${riderName(toSettle.fleet_member_id)} ${kes(toSettle.net_amount)}?`
            : "Pay this statement?"
        }
        description="This sends real money to the rider's payout method through treasury."
        confirmLabel="Pay now"
        variant="warning"
        pending={settle.isPending}
        onConfirm={() => {
          if (!toSettle) return;
          settle.mutate(toSettle.id, {
            onSettled: () => setToSettle(null),
            onSuccess: (res) =>
              toast.success(`Payment sent. Reference ${res.payout_reference}`),
            onError: (err) =>
              toast.error(apiErrorText(err, "The payment did not go through")),
          });
        }}
      />
      <ConfirmDialog
        open={deleteRuleId !== null}
        onOpenChange={(open) => !open && setDeleteRuleId(null)}
        title="Delete this pay rule?"
        description="Deliveries already paid keep their amounts."
        confirmLabel="Delete rule"
        pending={deleteRule.isPending}
        onConfirm={() => {
          if (!deleteRuleId) return;
          deleteRule.mutate(deleteRuleId, {
            onSettled: () => setDeleteRuleId(null),
            onError: (err) =>
              toast.error(apiErrorText(err, "Could not delete the pay rule")),
          });
        }}
      />
    </div>
  );
}
