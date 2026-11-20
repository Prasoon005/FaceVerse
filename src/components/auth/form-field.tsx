import type { ComponentProps } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FormFieldProps = ComponentProps<typeof Input> & {
  id: string;
  label: string;
  error?: string;
};

/** Label + input + inline error, wired up with aria attributes. */
export function FormField({ id, label, error, ...inputProps }: FormFieldProps) {
  const errorId = `${id}-error`;
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="h-9"
        {...inputProps}
      />
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-danger-foreground">
          {error}
        </p>
      ) : null}
    </div>
  );
}
