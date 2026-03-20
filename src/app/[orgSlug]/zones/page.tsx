"use client";

import { Hexagon, MapPin, Plus } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/base";

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
        <Button disabled>
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
            <div className="flex h-125 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30">
              <div className="text-center">
                <MapPin className="mx-auto size-12 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Zone editor will be available after @bengo-hub/maps integration
                </p>
                <p className="text-xs text-muted-foreground/70">
                  Draw polygon boundaries to define delivery zones
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Empty state */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">Configured Zones</h2>
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Hexagon className="size-10 text-muted-foreground/30" />
              <p className="mt-3 text-sm text-muted-foreground">No zones configured yet.</p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                Zone management requires PostGIS geo-fence tables (Sprint 3).
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
