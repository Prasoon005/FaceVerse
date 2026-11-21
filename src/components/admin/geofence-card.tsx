"use client";

import { Crosshair, LoaderCircle, MapPin, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useServerAction } from "@/hooks/use-server-action";
import { updateGeofence } from "@/lib/actions/admin";

/** Admin: only allow self check-in near the office. The kiosk at the door is exempt. */
export function GeofenceCard({
  initial,
}: {
  initial: { enabled: boolean; lat: number | null; lng: number | null; radius: number };
}) {
  const { run, pending } = useServerAction();
  const [enabled, setEnabled] = useState(initial.enabled);
  const [lat, setLat] = useState(initial.lat?.toString() ?? "");
  const [lng, setLng] = useState(initial.lng?.toString() ?? "");
  const [radius, setRadius] = useState(String(initial.radius));
  const [locating, setLocating] = useState(false);

  function fillMyLocation() {
    if (!navigator.geolocation) {
      toast.error("This browser can't share its location.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setLocating(false);
        toast.success("Location filled in", {
          description: `Accurate to about ${Math.round(pos.coords.accuracy)} m. Save to apply.`,
        });
      },
      (err) => {
        setLocating(false);
        toast.error("Couldn't get your location", { description: err.message });
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  const num = (v: string) => (v.trim() === "" ? null : Number(v));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="size-4 text-brand" aria-hidden /> Office location check
        </CardTitle>
        <CardDescription>
          When on, members can mark attendance from their own phone only within this distance of the
          office. The kiosk is always allowed.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        <label className="flex items-center justify-between gap-4 rounded-xl bg-foreground/[0.03] px-4 py-3 ring-1 ring-foreground/[0.06]">
          <span className="grid">
            <span className="text-sm font-medium">Require being at the office</span>
            <span className="text-xs text-muted-foreground">
              Uses the phone&apos;s location at the moment of check-in.
            </span>
          </span>
          <Switch
            checked={enabled}
            onCheckedChange={setEnabled}
            aria-label="Require office location"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="grid gap-1.5">
            <Label htmlFor="geo-lat">Latitude</Label>
            <Input
              id="geo-lat"
              inputMode="decimal"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="28.6139"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="geo-lng">Longitude</Label>
            <Input
              id="geo-lng"
              inputMode="decimal"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              placeholder="77.2090"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="geo-radius">Radius (metres)</Label>
            <Input
              id="geo-radius"
              type="number"
              min={50}
              max={5000}
              step={10}
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={fillMyLocation} disabled={locating}>
            {locating ? (
              <LoaderCircle className="animate-spin" aria-hidden />
            ) : (
              <Crosshair aria-hidden />
            )}
            Use my current location
          </Button>
          <Button
            type="button"
            disabled={pending}
            onClick={() =>
              run(
                "geo",
                () =>
                  updateGeofence({
                    enabled,
                    lat: num(lat),
                    lng: num(lng),
                    radius: Number(radius) || 200,
                  }),
                { success: "Office location saved" },
              )
            }
          >
            {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : <Save aria-hidden />}
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
