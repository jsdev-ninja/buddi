import { t } from "@/lib/i18n/strings";

export type DisplayNameInput = {
  name?: string | null;
  kind?: "solo" | "couple" | null;
  partnerName?: string | null;
};

export function getDisplayName(profile: DisplayNameInput | null | undefined): string {
  const primary = profile?.name?.trim() || t("common.unknown");
  if (!isCoupleProfile(profile)) return primary;
  const partner = profile?.partnerName?.trim();
  if (!partner) return primary;
  return `${primary} & ${partner}`;
}

export function isCoupleProfile(
  profile: { kind?: "solo" | "couple" | null } | null | undefined
): boolean {
  return profile?.kind === "couple";
}
