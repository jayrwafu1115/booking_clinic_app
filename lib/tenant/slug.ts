import { RESERVED_SLUGS } from "@/lib/validations/settings";

export function slugifyClinicName(name: string) {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const candidate = base || "clinic";

  // Avoid colliding with app routes used at the root level.
  return RESERVED_SLUGS.has(candidate) ? `${candidate}-clinic` : candidate;
}
