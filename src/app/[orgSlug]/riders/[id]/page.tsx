"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, FileText, Star, Wallet } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/base";

export default function RiderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const riderId = params.id as string;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="size-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rider Details</h1>
          <p className="text-muted-foreground">Rider ID: {riderId}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
                JK
              </div>
              <div>
                <p className="font-semibold">John Kamau</p>
                <p className="text-sm text-muted-foreground">+254 712 345 678</p>
                <Badge variant="success" className="mt-1">Online</Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 border-t border-border pt-4">
              <div>
                <p className="text-xs text-muted-foreground">Rating</p>
                <p className="flex items-center gap-1 font-semibold">
                  <Star className="size-4 text-yellow-500" /> 4.8
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Tasks</p>
                <p className="font-semibold">245</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Member Since</p>
                <p className="font-semibold">Jan 2025</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Vehicle</p>
                <p className="font-semibold">Motorcycle</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-5" />
              Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { name: "National ID", status: "verified" },
                { name: "Driving License", status: "verified" },
                { name: "Insurance", status: "pending" },
                { name: "Vehicle Registration", status: "verified" },
              ].map((doc) => (
                <div
                  key={doc.name}
                  className="flex items-center justify-between rounded-md border border-border p-3"
                >
                  <span className="text-sm">{doc.name}</span>
                  <Badge
                    variant={doc.status === "verified" ? "success" : "warning"}
                    className="text-xs"
                  >
                    {doc.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Earnings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="size-5" />
              Earnings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-primary/5 p-4">
              <p className="text-xs text-muted-foreground">This Month</p>
              <p className="text-2xl font-bold text-primary">KES 48,500</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Today</p>
                <p className="font-semibold">KES 2,300</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">This Week</p>
                <p className="font-semibold">KES 12,400</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Task History */}
      <Card>
        <CardHeader>
          <CardTitle>Task History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-3 font-medium text-muted-foreground">Task ID</th>
                  <th className="pb-3 font-medium text-muted-foreground">Pickup</th>
                  <th className="pb-3 font-medium text-muted-foreground">Dropoff</th>
                  <th className="pb-3 font-medium text-muted-foreground">Status</th>
                  <th className="pb-3 font-medium text-muted-foreground">Duration</th>
                  <th className="pb-3 font-medium text-muted-foreground">Earned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  { id: "#1042", pickup: "Westlands Mall", dropoff: "Karen Estate", status: "completed", duration: "32m", earned: "KES 350" },
                  { id: "#1038", pickup: "CBD Office", dropoff: "Kilimani", status: "completed", duration: "25m", earned: "KES 280" },
                  { id: "#1035", pickup: "Junction Mall", dropoff: "Lavington", status: "completed", duration: "18m", earned: "KES 220" },
                ].map((task) => (
                  <tr key={task.id}>
                    <td className="py-3 font-medium">{task.id}</td>
                    <td className="py-3">{task.pickup}</td>
                    <td className="py-3">{task.dropoff}</td>
                    <td className="py-3">
                      <Badge variant="success" className="text-xs">{task.status}</Badge>
                    </td>
                    <td className="py-3">{task.duration}</td>
                    <td className="py-3 font-medium">{task.earned}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
