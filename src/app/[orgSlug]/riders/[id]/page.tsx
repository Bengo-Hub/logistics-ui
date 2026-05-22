"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  FileText,
  Loader2,
  Star,
  XCircle,
  AlertTriangle,
  Truck,
  User,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/base";
import {
  useFleetMember,
  useApproveMember,
  useSuspendMember,
  useRejectMember,
} from "@/hooks/use-logistics";
import type { FleetMemberStatus } from "@/types/logistics";

const statusVariant: Record<FleetMemberStatus, "success" | "warning" | "destructive" | "secondary"> = {
  active: "success",
  pending: "warning",
  suspended: "destructive",
  rejected: "secondary",
};

function DocRow({
  label,
  url,
}: {
  label: string;
  url?: string;
}) {
  if (!url) {
    return (
      <div className="flex items-center justify-between rounded-md border border-border p-3">
        <span className="text-sm">{label}</span>
        <Badge variant="secondary" className="text-xs">Not uploaded</Badge>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between rounded-md border border-border p-3">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <Badge variant="success" className="text-xs">Uploaded</Badge>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          View <ExternalLink className="size-3" />
        </a>
      </div>
    </div>
  );
}

export default function RiderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const riderId = params.id as string;

  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const { data: member, isLoading, isError } = useFleetMember(riderId);
  const approveMutation = useApproveMember();
  const suspendMutation = useSuspendMember();
  const rejectMutation = useRejectMember();

  const handleApprove = () => {
    approveMutation.mutate(riderId);
  };

  const handleSuspend = () => {
    if (!confirm("Suspend this rider? They will not be able to accept deliveries.")) return;
    suspendMutation.mutate(riderId);
  };

  const handleReject = () => {
    rejectMutation.mutate(
      { memberId: riderId, reason: rejectReason },
      { onSuccess: () => setShowRejectDialog(false) },
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !member) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle className="mb-3 size-10 text-destructive" />
        <p className="text-lg font-bold">Rider not found</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          Go back
        </Button>
      </div>
    );
  }

  const initials = `${member.first_name?.[0] ?? ""}${member.last_name?.[0] ?? ""}`.toUpperCase() || "?";
  const vehicle = member.edges?.vehicles?.[0];
  const isPending = member.status === "pending";
  const isActive = member.status === "active";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="size-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {member.first_name} {member.last_name}
          </h1>
          <p className="text-muted-foreground">{member.email}</p>
        </div>
        <div className="flex items-center gap-2">
          {isPending && (
            <>
              <Button
                size="sm"
                onClick={handleApprove}
                disabled={approveMutation.isPending}
              >
                {approveMutation.isPending ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 size-4" />
                )}
                Approve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setShowRejectDialog(true)}
              >
                <XCircle className="mr-2 size-4" />
                Reject
              </Button>
            </>
          )}
          {isActive && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleSuspend}
              disabled={suspendMutation.isPending}
            >
              {suspendMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Suspend
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="size-4" /> Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
                {initials}
              </div>
              <div>
                <p className="font-semibold">{member.first_name} {member.last_name}</p>
                <p className="text-sm text-muted-foreground">{member.phone || "—"}</p>
                <Badge variant={statusVariant[member.status]} className="mt-1">
                  {member.status}
                </Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 border-t border-border pt-4">
              <div>
                <p className="text-xs text-muted-foreground">Role</p>
                <p className="font-semibold text-sm">{member.role || "rider"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Member Since</p>
                <p className="font-semibold text-sm">
                  {new Date(member.created_at).toLocaleDateString("en-KE", { month: "short", year: "numeric" })}
                </p>
              </div>
              {member.emergency_contact_name && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Emergency Contact</p>
                  <p className="font-semibold text-sm">
                    {member.emergency_contact_name}
                    {member.emergency_contact_phone ? ` · ${member.emergency_contact_phone}` : ""}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* KYC Documents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-5" /> KYC Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <DocRow label="ID / Passport" url={member.id_passport_attachment} />
              <DocRow label="Rider Photo" url={member.rider_photo} />
              {member.id_passport_number && (
                <div className="rounded-md border border-border p-3">
                  <p className="text-xs text-muted-foreground">ID / Passport Number</p>
                  <p className="mt-0.5 font-mono text-sm">{member.id_passport_number}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Vehicle */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="size-5" /> Vehicle
            </CardTitle>
          </CardHeader>
          <CardContent>
            {vehicle ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{vehicle.registration_number}</span>
                  <Badge variant="secondary" className="text-xs capitalize">{vehicle.vehicle_type}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Make / Model</p>
                    <p className="font-medium">{vehicle.make} {vehicle.model}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Year</p>
                    <p className="font-medium">{vehicle.year || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Capacity</p>
                    <p className="font-medium">{vehicle.capacity_kg ? `${vehicle.capacity_kg} kg` : "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <p className="font-medium capitalize">{vehicle.status}</p>
                  </div>
                </div>
                {vehicle.license_plate_image && (
                  <div className="mt-2">
                    <p className="mb-1 text-xs text-muted-foreground">License Plate Photo</p>
                    <img
                      src={vehicle.license_plate_image}
                      alt="License plate"
                      className="h-24 w-full rounded-lg object-cover border border-border"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Truck className="mb-2 size-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No vehicle assigned</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reject Dialog */}
      {showRejectDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Reject Application</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This will reject {member.first_name} {member.last_name}&apos;s rider application.
              </p>
              <div className="space-y-1">
                <label className="text-sm font-medium">Reason (optional)</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g., Incomplete documents..."
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowRejectDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleReject}
                  disabled={rejectMutation.isPending}
                >
                  {rejectMutation.isPending && (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  )}
                  Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
