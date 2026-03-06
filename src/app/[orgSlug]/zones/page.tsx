"use client";

import { Hexagon, MapPin, Plus } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/base";

const mockZones = [
  { id: "1", name: "CBD & Downtown", riders: 8, activeTasks: 12, status: "active" as const },
  { id: "2", name: "Westlands", riders: 5, activeTasks: 7, status: "active" as const },
  { id: "3", name: "Karen & Langata", riders: 3, activeTasks: 4, status: "active" as const },
  { id: "4", name: "Kilimani & Lavington", riders: 4, activeTasks: 6, status: "active" as const },
  { id: "5", name: "Eastlands", riders: 2, activeTasks: 3, status: "inactive" as const },
];

export default function ZonesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Delivery Zones</h1>
          <p className="text-muted-foreground">
            Configure delivery zones and their boundaries.
          </p>
        </div>
        <Button>
          <Plus className="size-4" />
          Create Zone
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Zone Map */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hexagon className="size-5 text-primary" />
              Zone Map
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-[500px] items-center justify-center rounded-lg border border-dashed border-border bg-muted/30">
              <div className="text-center">
                <MapPin className="mx-auto size-12 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Interactive map for zone boundary configuration
                </p>
                <p className="text-xs text-muted-foreground/70">
                  Draw polygon boundaries with Leaflet / Mapbox
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Zone List */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">Configured Zones</h2>
          {mockZones.map((zone) => (
            <Card key={zone.id} className="cursor-pointer transition-shadow hover:shadow-md">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{zone.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {zone.riders} riders &middot; {zone.activeTasks} active tasks
                    </p>
                  </div>
                  <Badge variant={zone.status === "active" ? "success" : "secondary"} className="text-xs">
                    {zone.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
