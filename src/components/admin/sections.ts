export const adminSections = ["overview", "calendar", "customers", "treatments", "availability", "website"] as const;
export type AdminSection = (typeof adminSections)[number];

export function isAdminSection(value: string): value is AdminSection {
  return (adminSections as readonly string[]).includes(value);
}
