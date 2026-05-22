"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Loader2, Search, UserPlus, Users } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
} from "@/components/ui/base";
import { Pagination } from "@/components/ui/pagination";
import { orgRoute } from "@/lib/utils";
import { useFleetMembers, useBatchInviteMembers } from "@/hooks/use-logistics";
import type { FleetMemberStatus } from "@/types/logistics";

const statusColor: Record<FleetMemberStatus, "success" | "secondary" | "warning" | "destructive"> = {
  active: "success",
  pending: "warning",
  suspended: "destructive",
  rejected: "secondary",
};

const EMPTY_ROW = { first_name: "", last_name: "", email: "", phone: "" };

export default function RidersPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<FleetMemberStatus | "all">("all");
  const [page, setPage] = useState(1);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchRows, setBatchRows] = useState([{ ...EMPTY_ROW }]);

  const { data: members = [], isLoading, error } = useFleetMembers(
    filterStatus !== "all" ? filterStatus : undefined
  );
  const batchInvite = useBatchInviteMembers();

  const updateRow = (i: number, field: keyof typeof EMPTY_ROW, value: string) => {
    setBatchRows((rows) => rows.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  };

  const handleBatchInvite = () => {
    const valid = batchRows.filter((r) => r.email.trim());
    if (valid.length === 0) return;
    batchInvite.mutate(valid, {
      onSuccess: () => {
        setShowBatchModal(false);
        setBatchRows([{ ...EMPTY_ROW }]);
      },
    });
  };

  const filtered = members.filter((m) => {
    const fullName = `${m.first_name} ${m.last_name}`.toLowerCase();
    return fullName.includes(search.toLowerCase());
  });

  const perPage = 12;
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * perPage, safePage * perPage);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Riders</h1>
          <p className="text-muted-foreground">Manage your fleet members and their status.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowBatchModal(true)}>
            <Users className="size-4" />
            Batch Invite
          </Button>
          <Link href={orgRoute(orgSlug, "/riders/invite")}>
            <Button>
              <UserPlus className="size-4" />
              Add Rider
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search riders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "active", "pending", "suspended"] as const).map((s) => (
            <Button
              key={s}
              variant={filterStatus === s ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus(s)}
            >
              {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading riders...</span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            Failed to load riders. Please check your connection and try again.
          </p>
        </div>
      )}

      {/* Riders List */}
      {!isLoading && !error && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {paginated.map((member) => (
            <Link key={member.id} href={orgRoute(orgSlug, `/riders/${member.id}`)}>
              <Card className="transition-shadow hover:shadow-md">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                  <div>
                    <CardTitle className="text-base">
                      {member.first_name} {member.last_name}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">{member.phone || member.email}</p>
                  </div>
                  <Badge variant={statusColor[member.status]}>{member.status}</Badge>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Role:</span>
                      <span className="text-xs font-medium">{member.role || "rider"}</span>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Joined {new Date(member.created_at).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Pagination
        page={safePage}
        totalPages={totalPages}
        onPageChange={setPage}
        className="mt-6"
      />

      {!isLoading && !error && filtered.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">
            {members.length === 0
              ? "No riders yet. Invite your first rider to get started."
              : "No riders match your filters."}
          </p>
        </div>
      )}

      {/* Batch Invite Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle>Batch Invite Riders</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Add one or more riders. Only email is required.</p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {batchRows.map((row, i) => (
                  <div key={i} className="grid grid-cols-4 gap-2">
                    <input
                      placeholder="First name"
                      value={row.first_name}
                      onChange={(e) => updateRow(i, "first_name", e.target.value)}
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <input
                      placeholder="Last name"
                      value={row.last_name}
                      onChange={(e) => updateRow(i, "last_name", e.target.value)}
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <input
                      placeholder="Email *"
                      type="email"
                      value={row.email}
                      onChange={(e) => updateRow(i, "email", e.target.value)}
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <input
                      placeholder="Phone"
                      value={row.phone}
                      onChange={(e) => updateRow(i, "phone", e.target.value)}
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBatchRows((r) => [...r, { ...EMPTY_ROW }])}
              >
                + Add Row
              </Button>
              {batchInvite.isError && (
                <p className="text-sm text-destructive">Batch invite failed. Please try again.</p>
              )}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowBatchModal(false);
                    setBatchRows([{ ...EMPTY_ROW }]);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleBatchInvite}
                  disabled={batchInvite.isPending}
                >
                  {batchInvite.isPending ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : null}
                  Send Invites
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
