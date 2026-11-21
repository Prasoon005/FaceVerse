"use client";

import imageCompression from "browser-image-compression";
import { Building2, Camera, LoaderCircle, Phone, Save, Trash2, User } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { FormField } from "@/components/auth/form-field";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useServerAction } from "@/hooks/use-server-action";
import { setAvatar, updateProfile } from "@/lib/actions/profile";
import { formatDay } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";

export type ProfileData = {
  userId: string;
  email: string;
  role: "admin" | "member";
  joinedDay: string;
  fullName: string;
  phone: string;
  department: string;
  avatarUrl: string | null;
  hasUploadedPhoto: boolean;
};

/** Profile card (photo, name, contact) used by both portals. */
export function ProfileForm({ profile }: { profile: ProfileData }) {
  const { run, pending, busyKey } = useServerAction();
  const [fullName, setFullName] = useState(profile.fullName);
  const [phone, setPhone] = useState(profile.phone);
  const [department, setDepartment] = useState(profile.department);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Pick an image file.");
      return;
    }
    setUploading(true);
    try {
      const small = await imageCompression(file, {
        maxSizeMB: 0.3,
        maxWidthOrHeight: 512,
        fileType: "image/webp",
        useWebWorker: true,
      });
      const path = `${profile.userId}/avatar-${Date.now()}.webp`;
      const { error } = await createClient()
        .storage.from("avatars")
        .upload(path, small, { contentType: "image/webp", upsert: false });
      if (error) throw error;
      setPreview(URL.createObjectURL(small));
      run("photo", () => setAvatar(path), { success: "Photo updated" });
    } catch (err) {
      toast.error("Couldn't upload the photo", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const photo = preview ?? profile.avatarUrl;

  return (
    <div className="grid gap-6">
      <Card className="overflow-hidden p-0">
        <div className="relative h-28 bg-[radial-gradient(120%_120%_at_0%_0%,var(--orb-1),transparent_60%),radial-gradient(120%_120%_at_100%_0%,var(--orb-2),transparent_60%)]" />
        <div className="-mt-12 flex flex-col items-center gap-3 px-6 pb-6 text-center sm:flex-row sm:items-end sm:text-left">
          <div className="relative">
            <UserAvatar
              name={fullName || profile.email}
              src={photo}
              size="xl"
              className="ring-card"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              aria-label="Change photo"
              className="absolute -right-1 -bottom-1 grid size-8 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105"
            >
              {uploading ? (
                <LoaderCircle className="size-4 animate-spin" aria-hidden />
              ) : (
                <Camera className="size-4" aria-hidden />
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(e) => void onFile(e.target.files?.[0])}
            />
          </div>
          <div className="grid flex-1 gap-1">
            <h2 className="text-xl font-semibold tracking-tight">{fullName || "Your name"}</h2>
            <p className="text-sm text-muted-foreground">{profile.email}</p>
            <div className="flex flex-wrap justify-center gap-1.5 sm:justify-start">
              <Badge variant="secondary">{profile.role === "admin" ? "Admin" : "Member"}</Badge>
              {department ? <Badge variant="outline">{department}</Badge> : null}
              <Badge variant="outline">
                Joined {formatDay(profile.joinedDay, { weekday: undefined, year: "numeric" })}
              </Badge>
            </div>
          </div>
          {profile.hasUploadedPhoto || preview ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() =>
                run("photo-remove", () => setAvatar(null), {
                  success: "Photo removed",
                  onSuccess: () => setPreview(null),
                })
              }
            >
              {busyKey === "photo-remove" ? (
                <LoaderCircle className="animate-spin" aria-hidden />
              ) : (
                <Trash2 aria-hidden />
              )}
              Remove photo
            </Button>
          ) : null}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <CardDescription>
            Shown to your admins on attendance and in the users list.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              run("save", () => updateProfile({ fullName, phone, department }), {
                success: "Profile saved",
              });
            }}
          >
            <div className="sm:col-span-2">
              <FormField
                id="fullName"
                label="Full name"
                icon={User}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                maxLength={80}
                autoComplete="name"
              />
            </div>
            <FormField
              id="phone"
              label="Phone"
              icon={Phone}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              inputMode="tel"
              autoComplete="tel"
              maxLength={20}
            />
            <FormField
              id="department"
              label="Department"
              icon={Building2}
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g. Engineering"
              maxLength={60}
            />
            <div className="sm:col-span-2">
              <Button type="submit" disabled={pending}>
                {busyKey === "save" ? (
                  <LoaderCircle className="animate-spin" aria-hidden />
                ) : (
                  <Save aria-hidden />
                )}
                Save changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
