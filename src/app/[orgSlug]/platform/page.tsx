"use client";

import { Globe, Key, Save, Server, Shield } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from "@/components/ui/base";
import { useAuthStore } from "@/store/auth";

export default function PlatformPage() {
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === "super_admin";

  if (!isSuperAdmin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Shield className="mx-auto size-12 text-muted-foreground/50" />
          <h2 className="mt-4 text-lg font-semibold">Access Restricted</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This page is only accessible to platform administrators.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Platform Administration</h1>
        <p className="text-muted-foreground">
          System-wide configuration for mapping providers and delivery settings.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Mapping Provider */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="size-5 text-primary" />
              Map Provider Configuration
            </CardTitle>
            <CardDescription>
              Configure the primary mapping service for route calculation and display.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Provider</label>
              <select className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <option value="mapbox">Mapbox</option>
                <option value="google_maps">Google Maps</option>
                <option value="leaflet_osm">Leaflet (OpenStreetMap)</option>
                <option value="here">HERE Maps</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Routing Engine</label>
              <select className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <option value="osrm">OSRM</option>
                <option value="mapbox_directions">Mapbox Directions</option>
                <option value="google_routes">Google Routes</option>
                <option value="valhalla">Valhalla</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Geocoding Provider</label>
              <select className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <option value="nominatim">Nominatim (OSM)</option>
                <option value="mapbox_geocoding">Mapbox Geocoding</option>
                <option value="google_geocoding">Google Geocoding</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* API Keys */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="size-5 text-primary" />
              API Keys
            </CardTitle>
            <CardDescription>
              Manage API keys for mapping and third-party services.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Mapbox Access Token</label>
              <Input type="password" placeholder="pk.eyJ1Ijoi..." />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Google Maps API Key</label>
              <Input type="password" placeholder="AIzaSy..." />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">HERE API Key</label>
              <Input type="password" placeholder="Enter HERE API key" />
            </div>
          </CardContent>
        </Card>

        {/* System-Wide Delivery Settings */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="size-5 text-primary" />
              System-Wide Delivery Settings
            </CardTitle>
            <CardDescription>
              Global settings applied across all tenants.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Default Currency</label>
                <select className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <option value="KES">KES - Kenyan Shilling</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Distance Unit</label>
                <select className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <option value="km">Kilometers</option>
                  <option value="mi">Miles</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Max Delivery Distance (km)</label>
                <Input type="number" defaultValue="25" min="1" max="100" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Base Delivery Fee</label>
                <Input type="number" defaultValue="100" min="0" step="10" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Per-KM Rate</label>
                <Input type="number" defaultValue="30" min="0" step="5" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Surge Multiplier Cap</label>
                <Input type="number" defaultValue="2.5" min="1" max="5" step="0.1" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="outline">Reset to Defaults</Button>
        <Button>
          <Save className="size-4" />
          Save Configuration
        </Button>
      </div>
    </div>
  );
}
