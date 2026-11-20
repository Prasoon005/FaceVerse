"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Eye, Mic, MoreHorizontal, Trash2, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { createDataTableColumnHelper, DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { deletePerson, listPeople, peopleKeys, type PersonListItem } from "@/lib/data/people";
import { formatRelative } from "@/lib/format";

import { ListTypeBadge } from "./list-type-badge";
import { PersonAvatar } from "./person-avatar";

const helper = createDataTableColumnHelper<PersonListItem>();

export function PeopleTable() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, isPending, error } = useQuery({ queryKey: peopleKeys.list(), queryFn: listPeople });
  const [toDelete, setToDelete] = useState<PersonListItem | null>(null);

  const remove = useMutation({
    mutationFn: deletePerson,
    onSuccess: async (_, person) => {
      toast.success(`${person.name} deleted`);
      await queryClient.invalidateQueries({ queryKey: peopleKeys.all });
    },
    onError: (err) => toast.error("Delete failed", { description: err.message }),
  });

  const columns = useMemo(
    () =>
      helper.columns([
        helper.accessor("name", {
          header: "Name",
          cell: ({ row }) => (
            <span className="flex items-center gap-3">
              <PersonAvatar name={row.original.name} url={row.original.avatarUrl} />
              <span className="font-medium">{row.original.name}</span>
            </span>
          ),
        }),
        helper.accessor((p) => p.label ?? "", {
          id: "label",
          header: "Label",
          cell: ({ getValue }) =>
            getValue() ? (
              <span className="capitalize">{getValue()}</span>
            ) : (
              <span className="text-muted-foreground">—</span>
            ),
        }),
        helper.accessor("list_type", {
          header: "List",
          cell: ({ getValue }) => <ListTypeBadge listType={getValue()} />,
        }),
        helper.accessor("face_samples", {
          header: "Samples",
          cell: ({ row }) => (
            <span className="font-mono text-xs tabular-nums">
              {row.original.face_samples} face · {row.original.voice_samples} voice
            </span>
          ),
        }),
        helper.accessor((p) => p.last_seen_at ?? "", {
          id: "last_seen",
          header: "Last seen",
          sortFn: "datetime",
          cell: ({ row }) => (
            <span className="text-muted-foreground">
              {formatRelative(row.original.last_seen_at)}
            </span>
          ),
        }),
        helper.display({
          id: "actions",
          header: () => <span className="sr-only">Actions</span>,
          cell: ({ row }) => (
            // Stop row-click navigation when using the menu.
            <div onClick={(e) => e.stopPropagation()} className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Actions for ${row.original.name}`}
                  >
                    <MoreHorizontal aria-hidden />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/people/${row.original.id}`}>
                      <Eye aria-hidden /> View
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/enroll?person=${row.original.id}`}>
                      <Camera aria-hidden /> Add samples
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/enroll?person=${row.original.id}&mode=voice`}>
                      <Mic aria-hidden /> Add voice
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => setToDelete(row.original)}
                  >
                    <Trash2 aria-hidden /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ),
        }),
      ]),
    [],
  );

  if (isPending) {
    return (
      <div className="grid gap-3" aria-busy="true" aria-label="Loading people">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="Couldn't load people"
        description={error.message}
        action={
          <Button variant="outline" onClick={() => router.refresh()}>
            Retry
          </Button>
        }
      />
    );
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={data}
        searchPlaceholder="Search people…"
        onRowClick={(p) => router.push(`/people/${p.id}`)}
        empty={
          <EmptyState
            className="m-4 border-0"
            title="No one enrolled yet"
            description="Enroll yourself first, then a couple of friends, and try live recognition."
            action={
              <Button asChild size="sm">
                <Link href="/enroll">
                  <UserPlus aria-hidden /> Enroll a person
                </Link>
              </Button>
            }
          />
        }
      />
      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={`Delete ${toDelete?.name ?? "person"}?`}
        description="This permanently removes their face samples, profile photo and recognition history."
        confirmText={toDelete?.name}
        onConfirm={async () => {
          if (toDelete) await remove.mutateAsync(toDelete);
        }}
      />
    </>
  );
}
