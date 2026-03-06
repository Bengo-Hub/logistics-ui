"use client";

import { Save, Settings, Zap } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from "@/components/ui/base";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Configure logistics operations, auto-assignment, and SLA thresholds.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Auto-Assignment Rules */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="size-5 text-primary" />
              Auto-Assignment Rules
            </CardTitle>
            <CardDescription>
              Configure how tasks are automatically assigned to riders.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Assignment Strategy</label>
              <select className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <option value="nearest">Nearest Rider</option>
                <option value="least_busy">Least Busy</option>
                <option value="highest_rated">Highest Rated</option>
                <option value="round_robin">Round Robin</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Max Search Radius (km)</label>
              <Input type="number" defaultValue="5" min="1" max="50" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Max Concurrent Tasks per Rider</label>
              <Input type="number" defaultValue="3" min="1" max="10" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Assignment Timeout (seconds)</label>
              <Input type="number" defaultValue="60" min="15" max="300" />
            </div>
          </CardContent>
        </Card>

        {/* SLA Thresholds */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="size-5 text-primary" />
              SLA Thresholds
            </CardTitle>
            <CardDescription>
              Define service level agreements for delivery operations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Pickup SLA (minutes)</label>
              <Input type="number" defaultValue="15" min="5" max="120" />
              <p className="text-xs text-muted-foreground">
                Time from task creation to rider arriving at pickup.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Delivery SLA (minutes)</label>
              <Input type="number" defaultValue="45" min="10" max="180" />
              <p className="text-xs text-muted-foreground">
                Total time from task creation to successful delivery.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">SLA Breach Alert</label>
              <select className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <option value="email">Email Notification</option>
                <option value="sms">SMS Alert</option>
                <option value="both">Email + SMS</option>
                <option value="webhook">Webhook</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Warning Threshold (%)</label>
              <Input type="number" defaultValue="80" min="50" max="95" />
              <p className="text-xs text-muted-foreground">
                Alert when delivery time reaches this % of SLA.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button>
          <Save className="size-4" />
          Save Settings
        </Button>
      </div>
    </div>
  );
}
