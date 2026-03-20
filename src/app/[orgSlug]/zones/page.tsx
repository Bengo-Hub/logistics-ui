"use client";

import { useState } from "react";
import { Hexagon, Loader2, MapPin, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
} from "@/components/ui/base";
import {
  useZones,
  useCreateZone,
  useUpdateZone,
  useDeleteZone,
  type GeoFence,
} from "@/hooks/use-logistics";

const ZONE_COLORS = [
  "#3b82f6", "#22c55e", "#ef4444", "#f59e0b", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316",
];

const statusVariant: Record<string, "success" | "secondary" | "warning"> = {
  active: "success",
  inactive: "secondary",
  draft: "warning",
};

export default function ZonesPage() {
  const { data: zones = [], isLoading, error } = useZones();
  const createZone = useCreateZone();
  const updateZone = useUpdateZone();
  const deleteZone = useDeleteZone();

  const [showForm, setShowForm] = useState(false);
  const [editingZone, setEditingZone] = useState<GeoFence | null>(null);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("delivery");
  const [formStatus, setFormStatus] = useState("active");
  const [formColor, setFormColor] = useState(ZONE_COLORS[0]);
  const [formBoundary, setFormBoundary] = useState("");

  function openCreate() {
    setEditingZone(null);
    setFormName("");
    setFormType("delivery");
    setFormStatus("active");
    setFormColor(ZONE_COLORS[Math.floor(Math.random() * ZONE_COLORS.length)]);
    setFormBoundary("");
    setShowForm(true);
  }

  function openEdit(zone: GeoFence) {
    setEditingZone(zone);
    setFormName(zone.name);
    setFormType(zone.zone_type);
    setFormStatus(zone.status);
    setFormColor(zone.color);
    setFormBoundary(JSON.stringify(zone.boundary));
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    let boundary: number[][];
    try {
      boundary = JSON.parse(formBoundary);
      if (!Array.isArray(boundary) || boundary.length < 3) {
        throw new Error("need 3+ points");
      }
    } catch {
      alert("Invalid boundary. Provide a JSON array of [lng, lat] coordinate pairs (minimum 3 points).");
      return;
    }

    if (editingZone) {
      await updateZone.mutateAsync({
        zoneId: editingZone.id,
        name: formName,
        zone_type: formType,
        status: formStatus,
        boundary,
        color: formColor,
      });
    } else {
      await createZone.mutateAsync({
        name: formName,
        zone_type: formType,
        status: formStatus,
        boundary,
        color: formColor,
      });
    }
    setShowForm(false);
  }

  async function handleDelete(zoneId: string) {
    if (!confirm("Delete this zone? This action cannot be undone.")) return;
    await deleteZone.mutateAsync(zoneId);
    if (selectedZone === zoneId) setSelectedZone(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Delivery Zones</h1>
          <p className="text-muted-foreground">
            Configure delivery zones and their boundaries.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          Create Zone
        </Button>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{editingZone ? "Edit Zone" : "Create Zone"}</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
              <X className="size-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Zone Name</label>
                  <Input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. CBD & Downtown"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="delivery">Delivery</option>
                    <option value="pickup">Pickup</option>
                    <option value="exclusion">Exclusion</option>
                    <option value="surge">Surge</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Color</label>
                  <div className="flex gap-2 mt-1">
                    {ZONE_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setFormColor(c)}
                        className={`size-7 rounded-full border-2 ${
                          formColor === c ? "border-foreground" : "border-transparent"
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">
                  Boundary Coordinates (JSON)
                </label>
                <p className="text-xs text-muted-foreground mb-1">
                  Array of [longitude, latitude] pairs forming a polygon. Minimum 3 points.
                  Example: [[36.81, -1.28], [36.83, -1.28], [36.83, -1.30], [36.81, -1.30]]
                </p>
                <textarea
                  value={formBoundary}
                  onChange={(e) => setFormBoundary(e.target.value)}
                  placeholder='[[36.81, -1.28], [36.83, -1.28], [36.83, -1.30], [36.81, -1.30]]'
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                  required
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createZone.isPending || updateZone.isPending}
                >
                  {(createZone.isPending || updateZone.isPending) && (
                    <Loader2 className="size-4 animate-spin" />
                  )}
                  {editingZone ? "Update Zone" : "Create Zone"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading zones...</span>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">Failed to load zones.</p>
        </div>
      )}

      {!isLoading && !error && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Map Placeholder */}
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
                    Interactive zone map will render after @bengo-hub/maps integration
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    {zones.length} zone{zones.length !== 1 ? "s" : ""} configured
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Zone List */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground">
              Configured Zones ({zones.length})
            </h2>

            {zones.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Hexagon className="size-10 text-muted-foreground/30" />
                  <p className="mt-3 text-sm text-muted-foreground">
                    No zones configured yet.
                  </p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={openCreate}>
                    <Plus className="size-4" /> Create First Zone
                  </Button>
                </CardContent>
              </Card>
            )}

            {zones.map((zone) => (
              <Card
                key={zone.id}
                className={`cursor-pointer transition-shadow hover:shadow-md ${
                  selectedZone === zone.id ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => setSelectedZone(selectedZone === zone.id ? null : zone.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="size-4 rounded-full"
                        style={{ backgroundColor: zone.color }}
                      />
                      <div>
                        <p className="font-medium">{zone.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {zone.zone_type} &middot; {zone.boundary?.length || 0} points
                        </p>
                      </div>
                    </div>
                    <Badge variant={statusVariant[zone.status] ?? "secondary"} className="text-xs">
                      {zone.status}
                    </Badge>
                  </div>
                  {selectedZone === zone.id && (
                    <div className="mt-3 flex gap-2 border-t pt-3">
                      <Button variant="outline" size="sm" onClick={() => openEdit(zone)}>
                        <Pencil className="size-3" /> Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(zone.id)}
                        disabled={deleteZone.isPending}
                      >
                        <Trash2 className="size-3" /> Delete
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
