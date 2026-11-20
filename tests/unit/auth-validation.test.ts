import { describe, expect, it } from "vitest";

import { loginSchema, safeNextPath, signupSchema } from "@/lib/validations/auth";

describe("safeNextPath", () => {
  it("keeps same-origin relative paths", () => {
    expect(safeNextPath("/people/123?tab=history")).toBe("/people/123?tab=history");
  });

  it.each([null, undefined, "", "https://evil.com", "//evil.com", "/\\evil.com", "dashboard"])(
    "falls back for unsafe value %s",
    (value) => {
      expect(safeNextPath(value)).toBe("/dashboard");
    },
  );
});

describe("loginSchema", () => {
  it("accepts a valid email and password", () => {
    expect(loginSchema.safeParse({ email: "a@b.co", password: "x" }).success).toBe(true);
  });

  it("rejects an invalid email", () => {
    expect(loginSchema.safeParse({ email: "nope", password: "x" }).success).toBe(false);
  });
});

describe("signupSchema", () => {
  const valid = {
    fullName: "Ada Lovelace",
    email: "ada@example.com",
    password: "analytical1",
    confirmPassword: "analytical1",
  };

  it("accepts a valid signup", () => {
    expect(signupSchema.safeParse(valid).success).toBe(true);
  });

  it("requires matching passwords", () => {
    const result = signupSchema.safeParse({ ...valid, confirmPassword: "different1" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["confirmPassword"]);
  });

  it("requires a letter and a number in the password", () => {
    expect(
      signupSchema.safeParse({ ...valid, password: "12345678", confirmPassword: "12345678" })
        .success,
    ).toBe(false);
    expect(
      signupSchema.safeParse({ ...valid, password: "abcdefgh", confirmPassword: "abcdefgh" })
        .success,
    ).toBe(false);
  });
});
