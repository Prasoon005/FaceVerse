"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Fingerprint, Info } from "lucide-react";
import Link from "next/link";
import { Controller, useForm } from "react-hook-form";

import { FormField } from "@/components/auth/form-field";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  LIST_TYPES,
  listTypeLabels,
  PERSON_LABELS,
  type PersonInput,
  personSchema,
} from "@/lib/validations/person";

export function DetailsStep({
  defaultValues,
  onNext,
}: {
  defaultValues?: Partial<PersonInput>;
  onNext: (values: PersonInput) => void;
}) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<PersonInput>({
    resolver: zodResolver(personSchema),
    defaultValues: { listType: "none", linkToMe: false, label: "", notes: "", ...defaultValues },
  });

  return (
    <form onSubmit={handleSubmit(onNext)} className="grid max-w-xl gap-5" noValidate>
      <FormField
        id="name"
        label="Full name"
        autoComplete="off"
        error={errors.name?.message}
        {...register("name")}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="label">Label</Label>
          <Controller
            control={control}
            name="label"
            render={({ field }) => (
              <Select value={field.value || undefined} onValueChange={field.onChange}>
                <SelectTrigger id="label" className="h-9 w-full">
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  {PERSON_LABELS.map((l) => (
                    <SelectItem key={l} value={l} className="capitalize">
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="listType">List</Label>
          <Controller
            control={control}
            name="listType"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="listType" className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LIST_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {listTypeLabels[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          rows={3}
          placeholder="Optional"
          aria-invalid={errors.notes ? true : undefined}
          {...register("notes")}
        />
        {errors.notes ? (
          <p role="alert" className="text-xs text-danger-foreground">
            {errors.notes.message}
          </p>
        ) : null}
      </div>

      <p className="flex gap-2 rounded-lg border border-brand/30 bg-brand/5 p-3 text-xs text-muted-foreground">
        <Fingerprint className="mt-0.5 size-3.5 shrink-0 text-brand" aria-hidden />
        <span>
          Enrolling yourself? Use{" "}
          <Link
            href="/identity"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            My identity
          </Link>{" "}
          instead. It&apos;s needed for attendance and biometric login.
        </span>
      </p>

      <p className="flex gap-2 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        Only face embeddings (numbers) are stored, plus an optional small thumbnail. You can delete
        them at any time from the person&apos;s page.
      </p>

      <div>
        <Button type="submit">
          Continue to face capture <ArrowRight aria-hidden />
        </Button>
      </div>
    </form>
  );
}
