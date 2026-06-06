export const strings = {
  en: {
    onboarding: {
      profileKind: { solo: "Solo Traveler", couple: "Couple" },
      partnerName: "Partner's Name",
      partnerAge: "Partner's Age",
      partnerAgeError: "Partner must be 18+",
    },
    profile: {
      aboutMe: "About Me",
      aboutUs: "About Us",
      aboutMePlaceholder: "Tell us about yourself…",
      aboutUsPlaceholder: "Tell us about you both…",
      couplePillLabel: "Couple",
    },
    edit: {
      profileTypeLabel: "Profile Type",
      switchToSoloNote: "Switching to Solo will hide partner details. They'll be restored if you switch back.",
      sharedBioNote: "Your bio text is shared between solo and couple modes.",
    },
    common: { unknown: "Unknown" },
  },
};

type NestedStringRecord = { [key: string]: string | NestedStringRecord };

function lookup(obj: NestedStringRecord, parts: string[]): string | undefined {
  const [head, ...tail] = parts;
  const value = obj[head];
  if (value === undefined) return undefined;
  if (tail.length === 0) return typeof value === "string" ? value : undefined;
  if (typeof value === "object") return lookup(value, tail);
  return undefined;
}

export function t(path: string): string {
  const result = lookup(strings.en as unknown as NestedStringRecord, path.split("."));
  if (result === undefined) {
    if (__DEV__) console.warn(`[i18n] Missing key: "${path}"`);
    return path;
  }
  return result;
}
