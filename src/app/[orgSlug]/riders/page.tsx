"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Search, UserPlus } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
} from "@/components/ui/base";
import { orgRoute } from "@/lib/utils";

type RiderStatus = "online" | "offline" | "busy";
type KycStatus = "verified" | "pending" | "rejected";

interface Rider {
  id: string;
  name: string;
  phone: string;
  status: RiderStatus;
  kycStatus: KycStatus;
  rating: number;
  completedTasks: number;
}

const statusColor: Record<RiderStatus, "success" | "secondary" | "warning"> = {
  online: "success",
  offline: "secondary",
  busy: "warning",
};

const kycColor: Record<KycStatus, "success" | "warning" | "destructive"> = {
  verified: "success",
  pending: "warning",
  rejected: "destructive",
};

const mockRiders: Rider[] = [
  { id: "1", name: "John Kamau", phone: "+254712345678", status: "online", kycStatus: "verified", rating: 4.8, completedTasks: 245 },
  { id: "2", name: "Jane Wanjiku", phone: "+254723456789", status: "busy", kycStatus: "verified", rating: 4.9, completedTasks: 312 },
  { id: "3", name: "Peter Ochieng", phone: "+254734567890", status: "offline", kycStatus: "pending", rating: 4.5, completedTasks: 89 },
  { id: "4", name: "Mary Akinyi", phone: "+254745678901", status: "online", kycStatus: "verified", rating: 4.7, completedTasks: 178 },
  { id: "5", name: "David Mwangi", phone: "+254756789012", status: "offline", kycStatus: "rejected", rating: 3.2, completedTasks: 12 },
];

export default function RidersPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<RiderStatus | "all">("all");

  const filtered = mockRiders.filter((r) => {
    const matchesSearch = r.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === "all" || r.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Riders</h1>
          <p className="text-muted-foreground">Manage your fleet members and their status.</p>
        </div>
        <Button>
          <UserPlus className="size-4" />
          Add Rider
        </Button>
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
          {(["all", "online", "offline", "busy"] as const).map((s) => (
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

      {/* Riders List */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((rider) => (
          <Link key={rider.id} href={orgRoute(orgSlug, `/riders/${rider.id}`)}>
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                <div>
                  <CardTitle className="text-base">{rider.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">{rider.phone}</p>
                </div>
                <Badge variant={statusColor[rider.status]}>{rider.status}</Badge>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">KYC:</span>
                    <Badge variant={kycColor[rider.kycStatus]} className="text-xs">
                      {rider.kycStatus}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-yellow-500">★</span>
                    <span className="font-medium">{rider.rating}</span>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {rider.completedTasks} tasks completed
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">No riders match your filters.</p>
        </div>
      )}
    </div>
  );
}
