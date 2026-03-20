"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Bike, Loader2, Navigation, Radio, Search } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
} from "@/components/ui/base";
import { api } from "@/lib/api/client";

interface LiveRider {
  rider_id: string;
  name: string;
  status: string;
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
  active_task_id: string | null;
  updated_at: string;
}

interface TrackingStats {
  riders_online: number;
  active_deliveries: number;
}

export default function TrackingPage() {
  const params = useParams();
  const tenantSlug = params.orgSlug as string;
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const waybill = searchParams.get("waybill");

  const [riders, setRiders] = useState<LiveRider[]>([]);
  const [stats, setStats] = useState<TrackingStats>({ riders_online: 0, active_deliveries: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [searchCode, setSearchCode] = useState(waybill || orderId || "");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch fleet tracking data via REST polling
  useEffect(() => {
    async function fetchFleet() {
      try {
        const { data } = await api.get(`${tenantSlug}/tracking/fleet`);
        const riderList: LiveRider[] = data.riders ?? [];
        setRiders(riderList);
        setStats({
          riders_online: riderList.length,
          active_deliveries: riderList.filter((r: LiveRider) => r.active_task_id).length,
        });
      } catch {
        // Silently handle - fleet endpoint may not be implemented yet
        setRiders([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchFleet();
    pollRef.current = setInterval(fetchFleet, 10_000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [tenantSlug]);

  function handleTrackSearch() {
    if (!searchCode.trim()) return;
    window.open(`/track/${searchCode.trim()}`, "_blank");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Real-Time Tracking</h1>
        <p className="text-muted-foreground">
          Monitor rider locations and delivery progress in real time.
        </p>
      </div>

      {/* Track by code search */}
      <Card>
        <CardContent className="flex gap-3 p-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Enter tracking code or order ID..."
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleTrackSearch()}
              className="pl-10"
            />
          </div>
          <Button onClick={handleTrackSearch} disabled={!searchCode.trim()}>
            Track
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Map */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Navigation className="size-5 text-primary" />
              Live Map
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-[600px] items-center justify-center rounded-lg border border-dashed border-border bg-muted/30">
              <div className="text-center">
                <Radio className="mx-auto size-12 text-primary/40 animate-pulse" />
                <p className="mt-3 text-sm text-muted-foreground">
                  Live fleet map will render here after @bengo-hub/maps integration
                </p>
                <p className="mt-1 text-xs text-muted-foreground/70">
                  {riders.length} rider{riders.length !== 1 ? "s" : ""} reporting location
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rider Panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bike className="size-5" />
                Active Riders
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading && (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              )}

              {!isLoading && riders.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No riders currently online.
                </p>
              )}

              {riders.map((rider) => (
                <div
                  key={rider.rider_id}
                  className="flex items-center justify-between rounded-md border border-border p-3 transition-colors hover:bg-muted/50"
                >
                  <div>
                    <p className="text-sm font-medium">{rider.name || `Rider ${rider.rider_id.slice(0, 6)}`}</p>
                    {rider.active_task_id ? (
                      <p className="text-xs text-muted-foreground">
                        Task: {rider.active_task_id.slice(0, 8)}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Idle</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge
                      variant={rider.active_task_id ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {rider.active_task_id ? "delivering" : "idle"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {rider.speed ? `${Math.round(rider.speed * 3.6)} km/h` : "—"}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tracking Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Riders Online</span>
                <span className="font-semibold">{stats.riders_online}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Active Deliveries</span>
                <span className="font-semibold">{stats.active_deliveries}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
