"use client";

import { useState } from "react";
import { Globe, Key, Server, Save, Shield } from "lucide-react";
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
import { useModuleAccess } from "@/hooks/use-module-access";

const TABS = [
  { id: "map-providers", label: "Map Providers", icon: Globe },
  { id: "system-config", label: "System Config", icon: Server },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function PlatformPage() {
  const { isPlatformOwner } = useModuleAccess();
  const [activeTab, setActiveTab] = useState<TabId>("map-providers");

  if (!isPlatformOwner) {
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Platform Administration</h1>
          <p className="text-muted-foreground text-sm">System-wide configuration for all tenants.</p>
        </div>
        <Badge variant="secondary" className="gap-1.5">
          <Shield className="size-3" /> Platform Admin
        </Badge>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="size-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Map Providers Tab */}
      {activeTab === "map-providers" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Globe className="size-4 text-primary" />
                Map Provider
              </CardTitle>
              <CardDescription>Configure the primary mapping service for routes and display.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Provider</label>
                <select className="flex h-9 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <option value="codevertex_tiles">Codevertex Tiles (Self-hosted OSM)</option>
                  <option value="mapbox">Mapbox</option>
                  <option value="google_maps">Google Maps</option>
                  <option value="here">HERE Maps</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Tile Server URL</label>
                <Input defaultValue="https://tiles.codevertexafrica.com" placeholder="https://tiles.example.com" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Routing Engine</label>
                <select className="flex h-9 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <option value="valhalla">Valhalla (Self-hosted)</option>
                  <option value="osrm">OSRM</option>
                  <option value="mapbox_directions">Mapbox Directions</option>
                  <option value="google_routes">Google Routes</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Geocoding Provider</label>
                <select className="flex h-9 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <option value="nominatim">Nominatim (OSM)</option>
                  <option value="mapbox_geocoding">Mapbox Geocoding</option>
                  <option value="google_geocoding">Google Geocoding</option>
                </select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Key className="size-4 text-primary" />
                API Keys
              </CardTitle>
              <CardDescription>Manage API keys for mapping and third-party services.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Mapbox Access Token</label>
                <Input type="password" placeholder="pk.eyJ1Ijoi…" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Google Maps API Key</label>
                <Input type="password" placeholder="AIzaSy…" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">HERE API Key</label>
                <Input type="password" placeholder="Enter HERE API key" />
              </div>
            </CardContent>
          </Card>

          <div className="lg:col-span-2 flex justify-end gap-3">
            <Button variant="outline">Reset to Defaults</Button>
            <Button><Save className="size-4" /> Save Map Config</Button>
          </div>
        </div>
      )}

      {/* System Config Tab */}
      {activeTab === "system-config" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Server className="size-4 text-primary" />
                System-Wide Delivery Settings
              </CardTitle>
              <CardDescription>Global defaults applied across all tenants. Tenants can override per-service settings from their own settings page.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Default Currency</label>
                  <select className="flex h-9 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <option value="KES">KES — Kenyan Shilling</option>
                    <option value="USD">USD — US Dollar</option>
                    <option value="EUR">EUR — Euro</option>
                    <option value="GBP">GBP — British Pound</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Distance Unit</label>
                  <select className="flex h-9 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <option value="km">Kilometers</option>
                    <option value="mi">Miles</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Max Delivery Distance (km)</label>
                  <Input type="number" defaultValue="25" min="1" max="100" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Base Delivery Fee</label>
                  <Input type="number" defaultValue="100" min="0" step="10" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Per-KM Rate</label>
                  <Input type="number" defaultValue="30" min="0" step="5" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Surge Multiplier Cap</label>
                  <Input type="number" defaultValue="2.5" min="1" max="5" step="0.1" />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="outline">Reset to Defaults</Button>
            <Button><Save className="size-4" /> Save Configuration</Button>
          </div>
        </div>
      )}
    </div>
  );
}
