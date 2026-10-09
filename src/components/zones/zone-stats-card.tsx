"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/base";
import { useZoneStats } from "@/hooks/use-zones";
import { money } from "./zone-utils";

const PERIODS = [
  { v: "today", l: "Today" },
  { v: "7d", l: "7 days" },
  { v: "30d", l: "30 days" },
  { v: "90d", l: "90 days" },
];

/** Deliveries, fees and timing per area (aggregated server-side). */
export function ZoneStatsCard() {
  const [period, setPeriod] = useState("30d");
  const { data = [], isLoading } = useZoneStats(period);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Deliveries by area</CardTitle>
            <CardDescription>Where orders go, what they earn and how fast they arrive.</CardDescription>
          </div>
          <div className="flex gap-1 rounded-lg border p-1">
            {PERIODS.map((p) => (
              <button
                key={p.v}
                type="button"
                onClick={() => setPeriod(p.v)}
                className={`rounded-md px-3 py-1 text-xs font-medium ${period === p.v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
              >
                {p.l}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="flex items-center gap-2 py-6 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading...
          </p>
        ) : data.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">No deliveries in this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-160 text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2">Area</th>
                  <th className="py-2 text-right">Deliveries</th>
                  <th className="py-2 text-right">Delivered</th>
                  <th className="py-2 text-right">Failed / cancelled</th>
                  <th className="py-2 text-right">Delivery fees</th>
                  <th className="py-2 text-right">Avg distance</th>
                  <th className="py-2 text-right">Avg time</th>
                  <th className="py-2 text-right">On time</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r.zone_id || "unzoned"} className="border-t">
                    <td className="py-2 font-medium">{r.zone_name}</td>
                    <td className="py-2 text-right">{r.tasks}</td>
                    <td className="py-2 text-right">{r.delivered}</td>
                    <td className="py-2 text-right">{r.failed + r.cancelled}</td>
                    <td className="py-2 text-right">{money(r.delivery_fees)}</td>
                    <td className="py-2 text-right">{r.avg_distance_km ? `${r.avg_distance_km.toFixed(1)} km` : "-"}</td>
                    <td className="py-2 text-right">{r.avg_delivery_minutes ? `${Math.round(r.avg_delivery_minutes)} min` : "-"}</td>
                    <td className="py-2 text-right">{r.on_time_percent ? `${Math.round(r.on_time_percent)}%` : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
