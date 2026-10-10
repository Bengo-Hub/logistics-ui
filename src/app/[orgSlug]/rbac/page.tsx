"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Info, Loader2, Plus, ShieldCheck, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from "@/components/ui/base";
import { useFleetMembers } from "@/hooks/use-fleet";
import { useMyPermissions } from "@/hooks/use-module-access";
import { useAssignRole, useRevokeRole, useRoles, useUserAssignments } from "@/hooks/use-rbac";
import type { LogisticsRole } from "@/types/logistics";

// Who can do what in logistics. Tenant admins hold everything through their sign-in role;
// sign-in roles like dispatcher or rider map to the matching system role; extra roles can be
// granted here. The API applies the same rule (rbac.Service.HasPermission).

const selectCls = "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm";

export default function RolesPage() {
  const { hasPermission } = useMyPermissions();
  const canManage = hasPermission("logistics.config.manage");
  const { data: roles = [], isLoading } = useRoles();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Roles and permissions</h1>
        <p className="text-sm text-muted-foreground">Who can dispatch, manage riders and change settings.</p>
      </div>

      <div className="flex gap-3 rounded-xl border border-border bg-muted/40 p-4 text-sm">
        <Info className="mt-0.5 size-4 shrink-0 text-primary" />
        <div className="space-y-1 text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">Admins</span> of your business have full access automatically.
          </p>
          <p>
            Sign-in roles carry over: dispatchers, delivery coordinators and fleet managers get the{" "}
            <span className="font-medium text-foreground">Dispatcher</span> role, riders and drivers the{" "}
            <span className="font-medium text-foreground">Driver</span> role. Grant a role below only to give someone more.
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" /> Roles
            </CardTitle>
            <CardDescription>System roles are kept up to date by the platform.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Loading roles...
              </p>
            ) : roles.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No roles yet.</p>
            ) : (
              roles.map((r) => <RoleRow key={r.id} role={r} />)
            )}
          </CardContent>
        </Card>

        <AssignmentsCard roles={roles} canManage={canManage} />
      </div>
    </div>
  );
}

function RoleRow({ role }: { role: LogisticsRole }) {
  const [open, setOpen] = useState(false);
  // Group codes by module: logistics.tasks.view -> tasks: view
  const grouped = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const code of role.permissions) {
      const [, mod = "other", action = code] = code.split(".");
      m.set(mod, [...(m.get(mod) ?? []), action.replace(/_/g, " ")]);
    }
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [role.permissions]);

  return (
    <div className="rounded-xl border border-border">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-3 p-3 text-left">
        {open ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronRight className="size-4 text-muted-foreground" />}
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 text-sm font-semibold">
            {role.name}
            {role.is_system_role && <Badge variant="secondary">System</Badge>}
          </span>
          {role.description && <span className="block truncate text-xs text-muted-foreground">{role.description}</span>}
        </span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Users className="size-3.5" /> {role.assignment_count}
        </span>
      </button>
      {open && (
        <div className="space-y-2 border-t border-border p-3">
          {grouped.length === 0 ? (
            <p className="text-xs text-muted-foreground">No permissions.</p>
          ) : (
            grouped.map(([mod, actions]) => (
              <div key={mod} className="flex flex-wrap items-baseline gap-1.5 text-xs">
                <span className="w-20 shrink-0 font-medium capitalize">{mod}</span>
                {actions.map((a) => (
                  <span key={a} className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
                    {a}
                  </span>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function AssignmentsCard({ roles, canManage }: { roles: LogisticsRole[]; canManage: boolean }) {
  const { data: assignments = [], isLoading } = useUserAssignments(canManage);
  const { data: members } = useFleetMembers({ limit: 100 });
  const assign = useAssignRole();
  const revoke = useRevokeRole();
  const [userId, setUserId] = useState("");
  const [roleId, setRoleId] = useState("");
  const [filter, setFilter] = useState("");

  const people = useMemo(
    () =>
      (members?.data ?? []).map((m) => ({
        id: m.user_id,
        label: [`${m.first_name ?? ""} ${m.last_name ?? ""}`.trim() || m.email, m.email].filter(Boolean).join(" · "),
      })),
    [members],
  );
  const shown = assignments.filter((a) =>
    `${a.user_name} ${a.user_email} ${a.role_name}`.toLowerCase().includes(filter.trim().toLowerCase()),
  );

  const grant = async () => {
    try {
      await assign.mutateAsync({ userId, roleId });
      toast.success("Role granted");
      setUserId("");
      setRoleId("");
    } catch (e) {
      toast.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Could not grant the role");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Granted roles</CardTitle>
        <CardDescription>Roles given here, on top of sign-in roles.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!canManage ? (
          <p className="text-sm text-muted-foreground">You need the settings permission to see and grant roles.</p>
        ) : (
          <>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_auto]">
              <select className={selectCls} value={userId} onChange={(e) => setUserId(e.target.value)}>
                <option value="">Choose a person</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
              <select className={selectCls} value={roleId} onChange={(e) => setRoleId(e.target.value)}>
                <option value="">Role</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <Button onClick={grant} disabled={!userId || !roleId || assign.isPending}>
                {assign.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                Grant
              </Button>
            </div>
            {assignments.length > 5 && (
              <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter by name, email or role" />
            )}
            {isLoading ? (
              <p className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Loading...
              </p>
            ) : shown.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                No roles granted yet. Sign-in roles still apply.
              </p>
            ) : (
              <div className="divide-y divide-border rounded-xl border border-border">
                {shown.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{a.user_name || a.user_email || a.user_id.slice(0, 8)}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {a.user_email} · since {new Date(a.assigned_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="secondary">{a.role_name}</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      title="Revoke role"
                      disabled={revoke.isPending}
                      onClick={async () => {
                        if (!confirm(`Remove the ${a.role_name} role from ${a.user_name || a.user_email}?`)) return;
                        try {
                          await revoke.mutateAsync(a.id);
                          toast.success("Role removed");
                        } catch {
                          toast.error("Could not remove the role");
                        }
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
