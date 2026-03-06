"use client";

import { Bike, MapPin, Navigation, Radio } from "lucide-react";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/base";

const liveRiders = [
  { id: "1", name: "John K.", status: "delivering", task: "TSK-1042", lastSeen: "Just now" },
  { id: "2", name: "Jane W.", status: "delivering", task: "TSK-1041", lastSeen: "1 min ago" },
  { id: "3", name: "Mary A.", status: "idle", task: null, lastSeen: "3 min ago" },
];

export default function TrackingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Real-Time Tracking</h1>
        <p className="text-muted-foreground">
          Monitor rider locations and delivery progress in real time.
        </p>
      </div>

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
                  Real-time delivery tracking map
                </p>
                <p className="mt-1 text-xs text-muted-foreground/70">
                  Integrate Leaflet or Mapbox with WebSocket for live rider positions
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
              {liveRiders.map((rider) => (
                <div
                  key={rider.id}
                  className="flex items-center justify-between rounded-md border border-border p-3 transition-colors hover:bg-muted/50"
                >
                  <div>
                    <p className="text-sm font-medium">{rider.name}</p>
                    {rider.task ? (
                      <p className="text-xs text-muted-foreground">Task: {rider.task}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Idle</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={rider.status === "delivering" ? "default" : "secondary"} className="text-xs">
                      {rider.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{rider.lastSeen}</span>
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
                <span className="font-semibold">3</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Active Deliveries</span>
                <span className="font-semibold">2</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Avg. Speed</span>
                <span className="font-semibold">28 km/h</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">GPS Coverage</span>
                <span className="font-semibold text-success">100%</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
