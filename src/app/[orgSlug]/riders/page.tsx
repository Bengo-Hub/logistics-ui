"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Loader2, Search, UserPlus } from "lucide-react";
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
import { useFleetMembers } from "@/hooks/use-logistics";
import type { FleetMemberStatus } from "@/types/logistics";

const statusColor: Record<FleetMemberStatus, "success" | "secondary" | "warning" | "destructive"> = {
  active: "success",
  pending: "warning",
  suspended: "destructive",
  rejected: "secondary",
};

export default function RidersPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<FleetMemberStatus | "all">("all");
  const [page, setPage] = useState(1);

  const { data: members = [], isLoading, error } = useFleetMembers(
    filterStatus !== "all" ? filterStatus : undefined
  );

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
        <Link href={orgRoute(orgSlug, "/riders/invite")}>
          <Button>
            <UserPlus className="size-4" />
            Add Rider
          </Button>
        </Link>
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
    </div>
  );
}
