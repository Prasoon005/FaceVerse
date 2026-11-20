import { z } from "zod";

export const LIST_TYPES = ["none", "allowed", "flagged"] as const;

export const listTypeLabels: Record<(typeof LIST_TYPES)[number], string> = {
  none: "None",
  allowed: "Allowed",
  flagged: "Flagged",
};

export const PERSON_LABELS = ["resident", "staff", "family", "friend", "visitor", "other"] as const;

export const personSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  label: z.string().trim().max(40).optional(),
  listType: z.enum(LIST_TYPES),
  notes: z.string().trim().max(500, "Keep notes under 500 characters").optional(),
  linkToMe: z.boolean(),
});

export type PersonInput = z.infer<typeof personSchema>;
