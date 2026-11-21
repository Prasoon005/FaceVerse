"use client";

import { motion } from "framer-motion";
import {
  Ban,
  CircleCheck,
  Hourglass,
  MoreHorizontal,
  Search,
  ShieldCheck,
  ShieldOff,
  Trash2,
  UserCheck,
  UserX,
  XCircle,
} from "lucide-react";
import { useState } from "react";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useServerAction } from "@/hooks/use-server-action";
import {
  deleteUserAccount,
  deleteUserBiometrics,
  setUserDisabled,
  setUserRole,
} from "@/lib/actions/admin";
import { formatPercent, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

import { type DrawerUser, UserDrawer } from "./user-drawer";

type Row = DrawerUser & { monthAbsent: number };

const enrollmentBadge = {
  approved: { label: "Face approved", icon: CircleCheck, className: "text-success-foreground" },
  pending: { label: "Awaiting approval", icon: Hourglass, className: "text-warning-foreground" },
  rejected: { label: "Rejected", icon: XCircle, className: "text-danger-foreground" },
  none: { label: "No face", icon: UserX, className: "text-muted-foreground" },
} as const;

type Confirm = { kind: "biometrics" | "account"; user: Row } | null;

export function UsersTable({ users, currentUserId }: { users: Row[]; currentUserId: string }) {
  const { run, busyKey } = useServerAction();
  const [query, setQuery] = useState("");
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const openUser = users.find((u) => u.id === openId) ?? null;
  const q = query.trim().toLowerCase();
  const filtered = q
    ? users.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    : users;

  return (
    <div className="grid gap-3">
      <div className="relative max-w-sm">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name or email…"
          className="pl-8"
          aria-label="Search users"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No users found" description="Try a different search." />
      ) : (
        <div className="glass-panel overflow-x-auto rounded-[22px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Face</TableHead>
                <TableHead className="text-right">People</TableHead>
                <TableHead className="text-right">This month</TableHead>
                <TableHead>Last sign-in</TableHead>
                <TableHead className="w-10">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u, i) => {
                const badge = enrollmentBadge[u.enrollment];
                const self = u.id === currentUserId;
                return (
                  <motion.tr
                    key={u.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={cn(
                      "border-b transition-colors hover:bg-muted/50",
                      u.disabled && "opacity-60",
                    )}
                  >
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => setOpenId(u.id)}
                        className="flex items-center gap-3 rounded-xl text-left"
                      >
                        <UserAvatar name={u.name} src={u.avatarUrl} status={u.today} size="md" />
                        <span className="grid">
                          <span className="font-medium underline-offset-4 hover:text-brand hover:underline">
                            {u.name}{" "}
                            {self ? (
                              <span className="text-xs text-muted-foreground">(you)</span>
                            ) : null}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {u.department ? `${u.department} · ` : ""}
                            {u.email}
                          </span>
                        </span>
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {u.role === "admin" ? (
                          <Badge variant="outline" className="text-brand">
                            <ShieldCheck aria-hidden /> Admin
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Member</Badge>
                        )}
                        {u.disabled ? (
                          <Badge variant="outline" className="text-danger-foreground">
                            <Ban aria-hidden /> Disabled
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn("inline-flex items-center gap-1 text-xs", badge.className)}
                      >
                        <badge.icon className="size-3.5" aria-hidden /> {badge.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {u.peopleCount}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-mono tabular-nums">{formatPercent(u.monthRate)}</span>
                      {u.monthAbsent > 0 ? (
                        <span className="block text-xs text-danger-foreground">
                          {u.monthAbsent} absent
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatRelative(u.lastSignInAt)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Actions for ${u.name}`}
                            disabled={busyKey === u.id}
                          >
                            <MoreHorizontal aria-hidden />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {u.role === "admin" ? (
                            <DropdownMenuItem
                              disabled={self}
                              onSelect={() =>
                                run(u.id, () => setUserRole({ userId: u.id, role: "member" }), {
                                  success: `${u.name} is now a member`,
                                })
                              }
                            >
                              <ShieldOff aria-hidden /> Remove admin
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onSelect={() =>
                                run(u.id, () => setUserRole({ userId: u.id, role: "admin" }), {
                                  success: `${u.name} is now an admin`,
                                })
                              }
                            >
                              <ShieldCheck aria-hidden /> Make admin
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            disabled={self}
                            onSelect={() =>
                              run(
                                u.id,
                                () => setUserDisabled({ userId: u.id, disabled: !u.disabled }),
                                {
                                  success: u.disabled ? `${u.name} enabled` : `${u.name} disabled`,
                                },
                              )
                            }
                          >
                            {u.disabled ? <UserCheck aria-hidden /> : <Ban aria-hidden />}
                            {u.disabled ? "Enable account" : "Disable account"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => setConfirm({ kind: "biometrics", user: u })}
                          >
                            <Trash2 aria-hidden /> Delete biometric data
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            disabled={self}
                            onSelect={() => setConfirm({ kind: "account", user: u })}
                          >
                            <UserX aria-hidden /> Delete account
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </motion.tr>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={
          confirm?.kind === "account"
            ? `Delete ${confirm.user.name}'s account?`
            : `Delete ${confirm?.user.name ?? ""}'s biometric data?`
        }
        description={
          confirm?.kind === "account"
            ? "This permanently deletes the account and all of its data: people, embeddings, recognition history, attendance and absence reviews."
            : "This removes every person they enrolled, with face and voice embeddings and photos. Their account and attendance history stay."
        }
        confirmText={confirm?.user.email ?? ""}
        actionLabel={confirm?.kind === "account" ? "Delete account" : "Delete data"}
        onConfirm={() => {
          if (!confirm) return;
          const { user, kind } = confirm;
          run(
            user.id,
            () =>
              kind === "account"
                ? deleteUserAccount({ userId: user.id })
                : deleteUserBiometrics({ userId: user.id }),
            {
              success: kind === "account" ? "Account deleted" : "Biometric data deleted",
              onSuccess: () => setConfirm(null),
            },
          );
        }}
      />
      <UserDrawer user={openUser} onOpenChange={(o) => !o && setOpenId(null)} />
    </div>
  );
}
