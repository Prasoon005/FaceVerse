import type { Metadata } from "next";

import { BiometricLogin } from "@/components/auth/biometric-login";
import { safeNextPath } from "@/lib/validations/auth";

export const metadata: Metadata = { title: "Biometric sign in" };

export default async function BiometricLoginPage({ searchParams }: PageProps<"/biometric-login">) {
  const params = await searchParams;
  const next = safeNextPath(typeof params.next === "string" ? params.next : null);

  return (
    <div className="grid gap-6" data-wide>
      <div className="grid gap-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in with face + voice</h1>
        <p className="text-sm text-muted-foreground">
          A demo-grade second factor. Your password always works too.
        </p>
      </div>
      <BiometricLogin next={next} />
    </div>
  );
}
