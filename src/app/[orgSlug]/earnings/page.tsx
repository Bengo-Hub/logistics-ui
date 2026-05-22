"use client";

import { useState } from "react";
import { DollarSign, FileText, Loader2, Plus, RefreshCw, Trash2, Wallet } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/base";
import {
  useEarningStatements,
  useBillingEvents,
  usePricingRules,
  useCreatePricingRule,
  useDeletePricingRule,
  useGenerateStatements,
  type PricingRule,
} from "@/hooks/use-earnings";

type Tab = "overview" | "pricing" | "events";

const TABS: { label: string; value: Tab }[] = [
  { label: "Statements", value: "overview" },
  { label: "Pricing Rules", value: "pricing" },
  { label: "Billing Events", value: "events" },
];

const STATUS_VARIANT: Record<string, "success" | "secondary" | "warning"> = {
  paid: "success",
  confirmed: "secondary",
  draft: "warning",
};

function formatKES(amount: number) {
  return `KES ${amount.toLocaleString("en-KE", { minimumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-KE", { month: "short", day: "numeric", year: "numeric" });
}

const EMPTY_RULE: Omit<PricingRule, "id" | "tenant_id" | "created_at" | "updated_at"> = {
  name: "",
  rule_type: "distance",
  base_fee: 0,
  per_km_rate: 0,
  surge_multiplier: 1,
  priority: 0,
  is_active: true,
};

export default function EarningsPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [showCreateRule, setShowCreateRule] = useState(false);
  const [newRule, setNewRule] = useState({ ...EMPTY_RULE });
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [genPeriod, setGenPeriod] = useState({ start: "", end: "" });

  const { data: statements = [], isLoading: loadingStmts } = useEarningStatements();
  const { data: events = [], isLoading: loadingEvents } = useBillingEvents();
  const { data: rules = [], isLoading: loadingRules } = usePricingRules();
  const createRule = useCreatePricingRule();
  const deleteRule = useDeletePricingRule();
  const generateStmts = useGenerateStatements();

  const totalPaid = statements.filter((s) => s.status === "paid").reduce((sum, s) => sum + s.net_amount, 0);
  const totalPending = statements.filter((s) => s.status !== "paid").reduce((sum, s) => sum + s.net_amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Wallet className="size-6" /> Earnings
          </h1>
          <p className="text-muted-foreground">Manage rider earnings, pricing rules, and billing events.</p>
        </div>
        <Button onClick={() => setShowGenerateModal(true)}>
          <RefreshCw className="mr-2 size-4" /> Generate Statements
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-12 items-center justify-center rounded-full bg-green-100">
              <DollarSign className="size-6 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Paid Out</p>
              <p className="text-xl font-bold">{formatKES(totalPaid)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-12 items-center justify-center rounded-full bg-amber-100">
              <DollarSign className="size-6 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pending Payout</p>
              <p className="text-xl font-bold">{formatKES(totalPending)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
              <FileText className="size-6 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Statements</p>
              <p className="text-xl font-bold">{statements.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-2">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Statements */}
      {tab === "overview" && (
        <Card>
          <CardHeader>
            <CardTitle>Earning Statements</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingStmts ? (
              <div className="flex justify-center py-8"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
            ) : statements.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-3 font-medium">Period</th>
                      <th className="pb-3 font-medium">Gross</th>
                      <th className="pb-3 font-medium">Net</th>
                      <th className="pb-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {statements.map((stmt) => (
                      <tr key={stmt.id}>
                        <td className="py-3">{formatDate(stmt.period_start)} – {formatDate(stmt.period_end)}</td>
                        <td className="py-3">{formatKES(stmt.gross_amount)}</td>
                        <td className="py-3 font-medium">{formatKES(stmt.net_amount)}</td>
                        <td className="py-3">
                          <Badge variant={STATUS_VARIANT[stmt.status] ?? "secondary"} className="text-xs capitalize">
                            {stmt.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="py-8 text-center text-muted-foreground">No statements yet. Use &ldquo;Generate Statements&rdquo; to create them.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pricing Rules */}
      {tab === "pricing" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowCreateRule(true)}>
              <Plus className="mr-2 size-4" /> New Rule
            </Button>
          </div>
          {loadingRules ? (
            <div className="flex justify-center py-8"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {rules.map((rule) => (
                <Card key={rule.id}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{rule.name}</p>
                        <Badge variant="secondary" className="text-xs capitalize mt-0.5">{rule.rule_type}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={rule.is_active ? "success" : "secondary"} className="text-xs">
                          {rule.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <button
                          onClick={() => {
                            if (confirm("Delete this pricing rule?")) deleteRule.mutate(rule.id);
                          }}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">Base Fee</p>
                        <p className="font-medium">KES {rule.base_fee.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Per km</p>
                        <p className="font-medium">{rule.per_km_rate != null ? `KES ${rule.per_km_rate.toFixed(2)}` : "—"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {rules.length === 0 && (
                <p className="col-span-2 py-8 text-center text-muted-foreground">No pricing rules configured.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Billing Events */}
      {tab === "events" && (
        <Card>
          <CardHeader>
            <CardTitle>Billing Events</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingEvents ? (
              <div className="flex justify-center py-8"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
            ) : events.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-3 font-medium">Event</th>
                      <th className="pb-3 font-medium">Amount</th>
                      <th className="pb-3 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {events.map((ev) => (
                      <tr key={ev.id}>
                        <td className="py-3 capitalize">{ev.event_type.replace(/_/g, " ")}</td>
                        <td className="py-3 font-medium text-green-600">+{formatKES(ev.amount)}</td>
                        <td className="py-3 text-muted-foreground">{formatDate(ev.occurred_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="py-8 text-center text-muted-foreground">No billing events recorded.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create Pricing Rule Modal */}
      {showCreateRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>New Pricing Rule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium">Name</label>
                <input
                  value={newRule.name}
                  onChange={(e) => setNewRule((r) => ({ ...r, name: e.target.value }))}
                  placeholder="e.g., Standard City Rate"
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Rule Type</label>
                <select
                  value={newRule.rule_type}
                  onChange={(e) => setNewRule((r) => ({ ...r, rule_type: e.target.value as PricingRule["rule_type"] }))}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="flat">Flat Rate</option>
                  <option value="distance">Distance-Based</option>
                  <option value="surge">Surge</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "base_fee", label: "Base Fee (KES)" },
                  { key: "per_km_rate", label: "Per km Rate" },
                  { key: "surge_multiplier", label: "Surge Multiplier" },
                  { key: "priority", label: "Priority" },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="text-xs font-medium text-muted-foreground">{label}</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={(newRule as Record<string, number | string | boolean>)[key] as number}
                      onChange={(e) => setNewRule((r) => ({ ...r, [key]: parseFloat(e.target.value) || 0 }))}
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                ))}
              </div>
              {createRule.isError && (
                <p className="text-sm text-destructive">Failed to create rule. Please try again.</p>
              )}
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => { setShowCreateRule(false); setNewRule({ ...EMPTY_RULE }); }}>
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  disabled={!newRule.name || createRule.isPending}
                  onClick={() => createRule.mutate(newRule, { onSuccess: () => { setShowCreateRule(false); setNewRule({ ...EMPTY_RULE }); } })}
                >
                  {createRule.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                  Create
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Generate Statements Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle>Generate Statements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Period Start</label>
                <input
                  type="date"
                  value={genPeriod.start}
                  onChange={(e) => setGenPeriod((p) => ({ ...p, start: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Period End</label>
                <input
                  type="date"
                  value={genPeriod.end}
                  onChange={(e) => setGenPeriod((p) => ({ ...p, end: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              {generateStmts.isError && (
                <p className="text-sm text-destructive">Failed to generate. Please try again.</p>
              )}
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowGenerateModal(false)}>
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  disabled={!genPeriod.start || !genPeriod.end || generateStmts.isPending}
                  onClick={() =>
                    generateStmts.mutate(
                      { period_start: genPeriod.start, period_end: genPeriod.end },
                      { onSuccess: () => { setShowGenerateModal(false); setGenPeriod({ start: "", end: "" }); } },
                    )
                  }
                >
                  {generateStmts.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                  Generate
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
