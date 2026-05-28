"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  Plus,
  Shield,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
} from "@/components/ui/base";
import { useRoles, usePermissions, useUserAssignments, useAssignRole, useRevokeRole } from "@/hooks/use-rbac";
import { useFleetMembers } from "@/hooks/use-fleet";
import type { LogisticsRole, UserRoleAssignment } from "@/types/logistics";

// ─── Permission category helpers ─────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  tasks: "Tasks",
  fleet: "Fleet",
  vehicles: "Vehicles",
  zones: "Zones",
  analytics: "Analytics",
  earnings: "Earnings",
  distribution: "Distribution",
  settings: "Settings",
  rbac: "Access Control",
  telemetry: "Telemetry",
  shifts: "Shifts",
  reporting: "Reporting",
};

function groupPermissionsByCategory(perms: Array<{ id: string; permission_code: string }>) {
  const groups: Record<string, typeof perms> = {};
  for (const p of perms) {
    const parts = p.permission_code.split(".");
    const cat = parts.length >= 2 ? parts[1] : "other";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(p);
  }
  return groups;
}

// ─── Role Card ────────────────────────────────────────────────────────────────

function RoleCard({ role }: { role: LogisticsRole }) {
  const [expanded, setExpanded] = useState(false);
  const permissions = role.edges?.permissions ?? [];
  const assignmentsCount = role.edges?.user_assignments?.length ?? 0;
  const grouped = groupPermissionsByCategory(permissions);
  const categoryCount = Object.keys(grouped).length;

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-primary/10 shrink-0">
              {role.is_system ? (
                <ShieldCheck className="size-4 text-primary" />
              ) : (
                <Shield className="size-4 text-primary" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-sm font-semibold">{role.name}</CardTitle>
                {role.is_system && (
                  <Badge variant="secondary" className="text-xs px-1.5 py-0">System</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground font-mono">{role.role_code}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {permissions.length > 0 && (
              <Badge variant="outline" className="text-xs gap-1">
                <Shield className="size-2.5" />
                {permissions.length} perm{permissions.length !== 1 ? "s" : ""}
                {categoryCount > 0 && `, ${categoryCount} categor${categoryCount !== 1 ? "ies" : "y"}`}
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {assignmentsCount} user{assignmentsCount !== 1 ? "s" : ""}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => setExpanded((v) => !v)}
              title={expanded ? "Collapse" : "Expand permissions"}
            >
              {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
            </Button>
          </div>
        </div>
        {role.description && (
          <p className="text-xs text-muted-foreground mt-1 ml-11">{role.description}</p>
        )}
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 border-t border-border">
          {permissions.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">No permissions configured.</p>
          ) : (
            <div className="space-y-3 pt-3">
              {Object.entries(grouped).map(([cat, perms]) => (
                <div key={cat}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    {CATEGORY_LABELS[cat] ?? cat}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {perms.map((p) => {
                      const action = p.permission_code.split(".").slice(2).join(".");
                      return (
                        <span
                          key={p.id}
                          className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground"
                          title={p.permission_code}
                        >
                          {action || p.permission_code}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ─── Assignment Row ───────────────────────────────────────────────────────────

function AssignmentRow({ assignment }: { assignment: UserRoleAssignment }) {
  const { mutateAsync: revokeRole, isPending } = useRevokeRole();

  async function handleRevoke() {
    try {
      await revokeRole({ userId: assignment.user_id, roleId: assignment.role_id });
      toast.success("Role revoked.");
    } catch {
      toast.error("Failed to revoke role.");
    }
  }

  const role = assignment.edges?.role;
  const user = assignment.edges?.user;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border p-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
        <Users className="size-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">
          {user ? `${user.first_name} ${user.last_name}`.trim() || `User ${assignment.user_id.slice(0, 8)}` : `User ${assignment.user_id.slice(0, 8)}`}
        </p>
        <p className="text-xs text-muted-foreground">
          {role?.name ?? assignment.role_id}
          {" · "}
          Assigned {new Date(assignment.created_at).toLocaleDateString()}
        </p>
      </div>
      <Badge variant="outline" className="text-xs font-mono shrink-0">
        {role?.role_code ?? "—"}
      </Badge>
      <Button
        variant="ghost"
        size="icon"
        className="size-7 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={handleRevoke}
        disabled={isPending}
        title="Revoke role"
      >
        {isPending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Trash2 className="size-3.5" />
        )}
      </Button>
    </div>
  );
}

// ─── Assign Role Dialog ───────────────────────────────────────────────────────

function AssignRolePanel({
  onClose,
}: {
  onClose: () => void;
}) {
  const [userId, setUserId] = useState("");
  const [roleId, setRoleId] = useState("");
  const { data: roles } = useRoles();
  const { data: membersData } = useFleetMembers({ limit: 100 });
  const { mutateAsync: assignRole, isPending } = useAssignRole();

  const members = membersData?.data ?? [];

  async function handleAssign() {
    if (!userId || !roleId) {
      toast.error("Select both a user and a role.");
      return;
    }
    try {
      await assignRole({ userId, roleId });
      toast.success("Role assigned.");
      onClose();
    } catch {
      toast.error("Failed to assign role.");
    }
  }

  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Assign Role to User</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium">User</label>
          <select
            className="flex h-9 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          >
            <option value="">Select user…</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {`${m.first_name} ${m.last_name}`.trim() || `Rider ${m.id.slice(0, 8)}`}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium">Role</label>
          <select
            className="flex h-9 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
          >
            <option value="">Select role…</option>
            {(roles ?? []).map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.role_code})
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2 pt-1">
          <Button size="sm" onClick={handleAssign} disabled={isPending}>
            {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <UserPlus className="size-3.5" />}
            Assign
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RbacPage() {
  const [tab, setTab] = useState<"roles" | "assignments">("roles");
  const [showAssign, setShowAssign] = useState(false);
  const [search, setSearch] = useState("");

  const { data: roles, isLoading: rolesLoading } = useRoles();
  const { data: assignments, isLoading: assignmentsLoading } = useUserAssignments();

  const filteredRoles = (roles ?? []).filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.role_code.toLowerCase().includes(search.toLowerCase())
  );

  const filteredAssignments = (assignments ?? []).filter((a) =>
    (a.edges?.role?.name ?? a.role_id).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">RBAC Management</h1>
          <p className="text-muted-foreground">Manage roles, permissions, and user assignments.</p>
        </div>
        <Button onClick={() => setShowAssign((v) => !v)}>
          <Plus className="size-4" />
          Assign Role
        </Button>
      </div>

      {showAssign && <AssignRolePanel onClose={() => setShowAssign(false)} />}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {(["roles", "assignments"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${
              tab === t
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "roles" ? `Roles (${(roles ?? []).length})` : `Assignments (${(assignments ?? []).length})`}
          </button>
        ))}
        <div className="ml-auto flex items-center pb-1">
          <Input
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-48 text-sm"
          />
        </div>
      </div>

      {/* Roles Tab */}
      {tab === "roles" && (
        <div className="space-y-3">
          {rolesLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {!rolesLoading && filteredRoles.length === 0 && (
            <div className="rounded-xl border border-dashed border-border py-16 text-center">
              <Shield className="mx-auto size-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">No roles found.</p>
            </div>
          )}
          {filteredRoles.map((role) => (
            <RoleCard key={role.id} role={role} />
          ))}
        </div>
      )}

      {/* Assignments Tab */}
      {tab === "assignments" && (
        <div className="space-y-3">
          {assignmentsLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {!assignmentsLoading && filteredAssignments.length === 0 && (
            <div className="rounded-xl border border-dashed border-border py-16 text-center">
              <Users className="mx-auto size-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">No role assignments found.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setShowAssign(true)}
              >
                <UserPlus className="size-3.5" />
                Assign First Role
              </Button>
            </div>
          )}
          {filteredAssignments.map((a) => (
            <AssignmentRow key={a.id} assignment={a} />
          ))}
        </div>
      )}
    </div>
  );
}
