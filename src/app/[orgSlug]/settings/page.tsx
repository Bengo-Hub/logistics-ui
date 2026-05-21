"use client";

import { Globe, Link2, Loader2, Save, Settings, Zap } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from "@/components/ui/base";

const NOTIFICATIONS_URL =
  process.env.NEXT_PUBLIC_NOTIFICATIONS_URL ||
  "https://notifications.codevertexitsolutions.com";

export default function SettingsPage() {
  const params = useParams();
  const orgSlug = (params?.orgSlug as string) || "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Configure logistics operations, auto-assignment, and SLA thresholds.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="size-5 text-primary" />
            Brand & organisation
          </CardTitle>
          <CardDescription>
            Logo and brand colours are managed in the Notifications service.
            To change your organisation logo, primary colour, or secondary colour,
            open the{" "}
            <a
              href={orgSlug ? `${NOTIFICATIONS_URL}/${orgSlug}/settings/branding` : "#"}
              className="text-primary underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Branding settings
            </a>{" "}
            page in Notifications (opens in new tab). Theme is applied automatically on this app from that config.
          </CardDescription>
        </CardHeader>
      </Card>

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

      <IntegrationsSection />
    </div>
  );
}

// ── Integrations Section ──────────────────────────────────────────────────────

const AUTH_API_URL_DEFAULT = process.env.NEXT_PUBLIC_AUTH_API_URL || 'https://sso.codevertexitsolutions.com';
const LOGISTICS_API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://logisticsapi.codevertexitsolutions.com';

function IntegrationsSection() {
  const [authApiUrl, setAuthApiUrl] = useState(AUTH_API_URL_DEFAULT);
  const [allowedOrigins, setAllowedOrigins] = useState('');
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'ok' | 'fail'>('idle');
  const [saving, setSaving] = useState(false);

  const testAuthConnection = async () => {
    setTestStatus('loading');
    try {
      const res = await fetch(`${authApiUrl}/healthz`);
      setTestStatus(res.ok ? 'ok' : 'fail');
    } catch {
      setTestStatus('fail');
    }
  };

  const handleSave = async () => {
    if (!allowedOrigins.trim()) return;
    setSaving(true);
    try {
      const { api } = await import('@/lib/api/client');
      await api.put('/api/v1/admin/config/allowed_origins', {
        config_value: allowedOrigins,
        config_type: 'string',
      });
    } catch {
      // best-effort
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Integrations</h2>
        <p className="text-muted-foreground text-sm mt-1">S2S auth, service URLs, and CORS configuration.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="size-5 text-primary" />
            S2S Auth
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Auth-API URL</label>
            <div className="flex gap-3">
              <Input
                value={authApiUrl}
                onChange={(e) => setAuthApiUrl(e.target.value)}
                className="flex-1"
              />
              <Button
                type="button"
                onClick={testAuthConnection}
                disabled={testStatus === 'loading'}
              >
                {testStatus === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Test'}
              </Button>
            </div>
            {testStatus === 'ok' && <p className="text-xs text-green-600">Connection successful</p>}
            {testStatus === 'fail' && <p className="text-xs text-red-600">Connection failed</p>}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Logistics API URL (this service)</label>
            <Input value={LOGISTICS_API_URL} readOnly className="opacity-60 cursor-not-allowed" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="size-5 text-primary" />
            CORS
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Allowed Origins</label>
            <Input
              placeholder="https://app.example.com, https://admin.example.com"
              value={allowedOrigins}
              onChange={(e) => setAllowedOrigins(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Comma-separated list of allowed CORS origins.</p>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            {saving ? 'Saving...' : 'Save Integrations'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
