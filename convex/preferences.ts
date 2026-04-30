import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";

export const GENDER_VALUES = ["man", "woman", "other"] as const;
export type Gender = (typeof GENDER_VALUES)[number];

export const genderValidator = v.union(
  v.literal("man"),
  v.literal("woman"),
  v.literal("other"),
);

export const isGender = (value: unknown): value is Gender =>
  typeof value === "string" &&
  (GENDER_VALUES as readonly string[]).includes(value);

type GenderProfile = Pick<Doc<"users">, "gender" | "genderPreference">;

// True iff `me` would consider `them` as a candidate based on declared
// gender + genderPreference. If either side has set a preference, the
// other side must have a gender that matches it.
export function isCompatible(me: GenderProfile, them: GenderProfile): boolean {
  if (
    me.genderPreference &&
    me.genderPreference.length > 0 &&
    (!them.gender || !me.genderPreference.includes(them.gender))
  ) {
    return false;
  }
  if (
    them.genderPreference &&
    them.genderPreference.length > 0 &&
    (!me.gender || !them.genderPreference.includes(me.gender))
  ) {
    return false;
  }
  return true;
}
