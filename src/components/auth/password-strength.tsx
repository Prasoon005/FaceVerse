import { cn } from "@/lib/utils";

/** 0-4 from length and character variety. */
export function passwordStrength(pw: string) {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(4, score);
}

const labels = ["Too short", "Weak", "Fair", "Good", "Strong"];
const colors = ["bg-danger", "bg-danger", "bg-warning", "bg-brand", "bg-success"];

/** Four-segment strength meter shown under the password field. */
export function PasswordStrength({ password }: { password: string }) {
  const score = passwordStrength(password);
  if (!password) return null;
  return (
    <div className="grid gap-1" aria-live="polite">
      <div className="grid grid-cols-4 gap-1">
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={cn(
              "h-1 rounded-full transition-colors duration-300",
              i <= score ? colors[score] : "bg-foreground/10",
            )}
          />
        ))}
      </div>
      <span className="text-xs text-muted-foreground">
        Password strength: <span className="font-medium text-foreground">{labels[score]}</span>
      </span>
    </div>
  );
}
