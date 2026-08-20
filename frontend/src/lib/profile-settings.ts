export type ProfileSettingsSection =
  | "profile"
  | "notifications"
  | "security"
  | "sessions"
  | "delete";

const profileSettingsSections = new Set<ProfileSettingsSection>([
  "profile",
  "notifications",
  "security",
  "sessions",
  "delete",
]);

export function isProfileSettingsSection(
  value: string | null,
): value is ProfileSettingsSection {
  return (
    value !== null &&
    profileSettingsSections.has(value as ProfileSettingsSection)
  );
}
