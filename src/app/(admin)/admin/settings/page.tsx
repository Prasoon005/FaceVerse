import type { Metadata } from "next";

import { GeofenceCard } from "@/components/admin/geofence-card";
import { HolidaysCard } from "@/components/admin/holidays-card";
import { ScoringRulesForm } from "@/components/admin/scoring-rules-form";
import { WorkspaceSettingsForm } from "@/components/admin/workspace-settings-form";
import { PageHeader } from "@/components/shared/page-header";
import { getAttendanceSettings, requireAdminPage } from "@/lib/admin/server";
import { localDay } from "@/lib/attendance/days";
import { formatClock, parseClock } from "@/lib/attendance/score";

export const metadata: Metadata = { title: "Workspace settings" };

export default async function AdminSettingsPage() {
  const { admin } = await requireAdminPage();
  const settings = await getAttendanceSettings(admin);

  return (
    <div className="grid max-w-2xl gap-6">
      <PageHeader
        title="Workspace settings"
        description="Working days, holidays, office location, hours and the company norms for the deduction score."
      />
      <WorkspaceSettingsForm workDays={settings.work_days} timezone={settings.timezone} />
      <HolidaysCard
        today={localDay(new Date(), settings.timezone)}
        holidays={Object.entries(settings.holidays)
          .map(([day, name]) => ({ day, name }))
          .sort((a, b) => a.day.localeCompare(b.day))}
      />
      <GeofenceCard
        initial={{
          enabled: settings.geofence_enabled,
          lat: settings.office_lat,
          lng: settings.office_lng,
          radius: settings.office_radius_m,
        }}
      />
      <ScoringRulesForm
        initial={{
          workStart: formatClock(parseClock(settings.work_start)),
          lateGraceMinutes: settings.late_grace_minutes,
          scoreBase: settings.score_base,
          deductAbsent: settings.deduct_absent,
          deductLate: settings.deduct_late,
          deductExcused: settings.deduct_excused,
          deductLateExcused: settings.deduct_late_excused,
        }}
      />
    </div>
  );
}
