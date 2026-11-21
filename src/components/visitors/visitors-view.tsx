"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  Camera,
  DoorClosed,
  DoorOpen,
  Download,
  ImageIcon,
  LogOut,
  Search,
  ScanFace,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PersonAvatar } from "@/components/people/person-avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { AnimatedNumber } from "@/components/shared/motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSoundFeedback } from "@/hooks/use-sound-feedback";
import { downloadBlob } from "@/lib/ai/capture";
import { addDays } from "@/lib/attendance/days";
import { createClient } from "@/lib/supabase/client";
import {
  checkOutVisit,
  getVisitorStats,
  listVisits,
  snapshotUrl,
  todayLocal,
  type VisitFilters,
  type VisitRow,
  visitorKeys,
  visitsToCsv,
  type VisitStatus,
} from "@/lib/data/visitors";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

import { ScanVisitorDialog } from "./scan-visitor-dialog";

const STATUSES: { value: VisitStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "inside", label: "Inside" },
  { value: "left", label: "Left" },
];

const time = (iso: string) =>
  new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
const date = (iso: string) =>
  new Intl.DateTimeFormat("en", { day: "numeric", month: "short" }).format(new Date(iso));

function duration(row: VisitRow) {
  const end = row.checkOut ? new Date(row.checkOut) : new Date();
  const minutes = Math.max(
    0,
    Math.round((end.getTime() - new Date(row.checkIn).getTime()) / 60000),
  );
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

/** The visitor log: live stats, filters, scan modal, check-out, snapshots and CSV export. */
export function VisitorsView() {
  const queryClient = useQueryClient();
  const { play } = useSoundFeedback();
  const today = todayLocal();
  const [filters, setFilters] = useState<VisitFilters>({
    from: addDays(today, -6),
    to: today,
    status: "all",
    search: "",
  });
  const [scanOpen, setScanOpen] = useState(false);

  const visits = useQuery({
    queryKey: visitorKeys.list(filters),
    queryFn: () => listVisits(filters),
  });
  const stats = useQuery({ queryKey: visitorKeys.stats(), queryFn: getVisitorStats });

  const checkOut = useMutation({
    mutationFn: checkOutVisit,
    onSuccess: () => {
      play("success");
      toast.success("Checked out");
      void queryClient.invalidateQueries({ queryKey: visitorKeys.all });
    },
    onError: (err) => {
      play("error");
      toast.error("Couldn't check out", { description: err.message });
    },
  });

  // Live: another device (e.g. the gate tablet) checks someone in → this list updates.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("visitor-logs")
      .on("postgres_changes", { event: "*", schema: "public", table: "visitor_logs" }, () => {
        void queryClient.invalidateQueries({ queryKey: visitorKeys.all });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  async function openSnapshot(path: string) {
    const url = await snapshotUrl(path);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
    else toast.error("Couldn't open the snapshot.");
  }

  function exportCsv() {
    const rows = visits.data ?? [];
    const blob = new Blob([visitsToCsv(rows)], { type: "text/csv;charset=utf-8" });
    downloadBlob(blob, `visitors_${filters.from}_to_${filters.to}.csv`);
  }

  const rows = visits.data ?? [];
  const tiles = [
    {
      label: "Inside now",
      value: stats.data?.insideNow ?? 0,
      icon: DoorOpen,
      tone: "bg-success/10 text-success-foreground",
    },
    {
      label: "Visits today",
      value: stats.data?.today ?? 0,
      icon: ScanFace,
      tone: "bg-brand/10 text-brand",
    },
    {
      label: "Unique visitors (7 days)",
      value: stats.data?.uniqueThisWeek ?? 0,
      icon: Users,
      tone: "bg-warning/10 text-warning-foreground",
    },
  ];

  return (
    <div className="grid gap-6">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-stretch">
        <ul className="grid gap-3 sm:grid-cols-3">
          {tiles.map((t, i) => (
            <motion.li
              key={t.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="hover-lift flex items-center gap-3 rounded-xl border bg-card p-4"
            >
              <span className={cn("grid size-10 place-items-center rounded-lg", t.tone)}>
                <t.icon className="size-5" aria-hidden />
              </span>
              <span className="grid">
                <span className="font-mono text-2xl font-semibold">
                  <AnimatedNumber value={t.value} />
                </span>
                <span className="text-xs text-muted-foreground">{t.label}</span>
              </span>
            </motion.li>
          ))}
        </ul>
        <Button size="lg" className="h-auto min-h-14 text-base" onClick={() => setScanOpen(true)}>
          <Camera aria-hidden /> Scan visitor
        </Button>
      </div>

      <div className="grid gap-3 rounded-xl border bg-card p-4 lg:grid-cols-[auto_auto_auto_1fr_auto] lg:items-end">
        <div className="grid grid-cols-2 gap-3 lg:contents">
          <div className="grid gap-1.5">
            <Label htmlFor="v-from">From</Label>
            <Input
              id="v-from"
              type="date"
              value={filters.from}
              max={filters.to}
              onChange={(e) =>
                e.target.value && setFilters((f) => ({ ...f, from: e.target.value }))
              }
              className="h-9"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="v-to">To</Label>
            <Input
              id="v-to"
              type="date"
              value={filters.to}
              min={filters.from}
              onChange={(e) => e.target.value && setFilters((f) => ({ ...f, to: e.target.value }))}
              className="h-9"
            />
          </div>
        </div>
        <div className="grid gap-1.5">
          <span className="text-sm font-medium">Status</span>
          <div role="radiogroup" aria-label="Status" className="flex rounded-lg border p-0.5">
            {STATUSES.map((s) => (
              <button
                key={s.value}
                type="button"
                role="radio"
                aria-checked={filters.status === s.value}
                onClick={() => setFilters((f) => ({ ...f, status: s.value }))}
                className={cn(
                  "relative flex-1 rounded-md px-3 py-1 text-sm transition-colors",
                  filters.status === s.value
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {filters.status === s.value ? (
                  <motion.span
                    layoutId="visit-status"
                    className="absolute inset-0 -z-10 rounded-md bg-brand/10"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                ) : null}
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="v-search">Search</Label>
          <div className="relative">
            <Search
              className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="v-search"
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              placeholder="Name, phone, purpose…"
              className="h-9 pl-8"
            />
          </div>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={rows.length === 0}>
          <Download aria-hidden /> Export CSV
        </Button>
      </div>

      {visits.isPending ? (
        <div className="grid gap-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          title="No visits in this range"
          description="Scan a visitor to log their first check-in."
          action={
            <Button onClick={() => setScanOpen(true)}>
              <Camera aria-hidden /> Scan visitor
            </Button>
          }
        />
      ) : (
        <>
          {/* Phones: cards. */}
          <ul className="grid gap-3 sm:hidden">
            <AnimatePresence initial={false}>
              {rows.map((r) => (
                <motion.li
                  key={r.id}
                  layout
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="grid gap-2 rounded-xl border bg-card p-3"
                >
                  <div className="flex items-center gap-3">
                    <PersonAvatar name={r.name} url={r.avatarUrl} className="size-10" />
                    <div className="grid min-w-0 flex-1">
                      <span className="truncate font-medium">{r.name}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {[r.purpose, r.host && `meets ${r.host}`].filter(Boolean).join(" · ") ||
                          "No details"}
                      </span>
                    </div>
                    <StatusBadge inside={!r.checkOut} />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-mono">
                      {date(r.checkIn)} · {time(r.checkIn)}
                      {r.checkOut ? ` → ${time(r.checkOut)}` : ""} · {duration(r)}
                    </span>
                    <span className="ml-auto flex gap-1">
                      {r.snapshotPath ? (
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label="View snapshot"
                          onClick={() => void openSnapshot(r.snapshotPath!)}
                        >
                          <ImageIcon aria-hidden />
                        </Button>
                      ) : null}
                      {r.checkOut ? null : (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={checkOut.isPending}
                          onClick={() => checkOut.mutate(r.id)}
                        >
                          <LogOut aria-hidden /> Out
                        </Button>
                      )}
                    </span>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>

          {/* Tablet & desktop: table. */}
          <div className="hidden overflow-x-auto rounded-xl border sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Visitor</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Meeting</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Check-out</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence initial={false}>
                  {rows.map((r) => (
                    <motion.tr
                      key={r.id}
                      layout
                      initial={{
                        opacity: 0,
                        backgroundColor: "color-mix(in oklab, var(--brand) 15%, transparent)",
                      }}
                      animate={{ opacity: 1, backgroundColor: "rgba(0,0,0,0)" }}
                      transition={{ duration: 1.2 }}
                      className="border-b transition-colors hover:bg-muted/50"
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <PersonAvatar name={r.name} url={r.avatarUrl} className="size-8" />
                          <div className="grid">
                            <span className="font-medium">{r.name}</span>
                            {r.phone ? (
                              <span className="text-xs text-muted-foreground">{r.phone}</span>
                            ) : null}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-48 truncate">{r.purpose ?? "–"}</TableCell>
                      <TableCell className="max-w-40 truncate">{r.host ?? "–"}</TableCell>
                      <TableCell
                        className="font-mono text-xs whitespace-nowrap"
                        title={formatRelative(r.checkIn)}
                      >
                        {date(r.checkIn)} {time(r.checkIn)}
                      </TableCell>
                      <TableCell className="font-mono text-xs whitespace-nowrap">
                        {r.checkOut ? (
                          `${time(r.checkOut)} (${duration(r)})`
                        ) : (
                          <span className="text-muted-foreground">{duration(r)} so far</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge inside={!r.checkOut} />
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {r.snapshotPath ? (
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-label={`View snapshot of ${r.name}`}
                            onClick={() => void openSnapshot(r.snapshotPath!)}
                          >
                            <ImageIcon aria-hidden />
                          </Button>
                        ) : null}
                        {r.checkOut ? null : (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={checkOut.isPending}
                            onClick={() => checkOut.mutate(r.id)}
                          >
                            <LogOut aria-hidden /> Check out
                          </Button>
                        )}
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <ScanVisitorDialog open={scanOpen} onOpenChange={setScanOpen} />
    </div>
  );
}

function StatusBadge({ inside }: { inside: boolean }) {
  return inside ? (
    <Badge variant="outline" className="border-success/40 text-success-foreground">
      <span className="relative mr-0.5 flex size-1.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-75" />
        <span className="relative inline-flex size-1.5 rounded-full bg-success" />
      </span>
      Inside
    </Badge>
  ) : (
    <Badge variant="outline" className="text-muted-foreground">
      <DoorClosed className="size-3" aria-hidden /> Left
    </Badge>
  );
}
