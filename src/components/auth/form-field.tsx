"use client";

import { Eye, EyeOff, type LucideIcon } from "lucide-react";
import { type ComponentProps, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FormFieldProps = ComponentProps<typeof Input> & {
  id: string;
  label: string;
  error?: string;
  /** Optional icon shown inside the input, on the left. */
  icon?: LucideIcon;
  /** Extra content under the input (e.g. a password strength meter). */
  hint?: React.ReactNode;
};

/**
 * Label + input + inline error, wired up with aria attributes. Password fields get a
 * show/hide toggle.
 */
export function FormField({
  id,
  label,
  error,
  icon: Icon,
  hint,
  type,
  className,
  ...inputProps
}: FormFieldProps) {
  const errorId = `${id}-error`;
  const isPassword = type === "password";
  const [visible, setVisible] = useState(false);

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-[13px] font-medium">
        {label}
      </Label>
      <div className="relative">
        {Icon ? (
          <Icon
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
        ) : null}
        <Input
          id={id}
          type={isPassword && visible ? "text" : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn("h-11 rounded-xl", Icon && "pl-9", isPassword && "pr-10", className)}
          {...inputProps}
        />
        {isPassword ? (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
            className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
          >
            {visible ? (
              <EyeOff className="size-4" aria-hidden />
            ) : (
              <Eye className="size-4" aria-hidden />
            )}
          </button>
        ) : null}
      </div>
      {hint}
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-danger-foreground">
          {error}
        </p>
      ) : null}
    </div>
  );
}
