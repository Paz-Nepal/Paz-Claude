/**
 * Typed registry for `admin.settings`. The database column is untyped
 * (key text, value jsonb) by design — see migration 0004 — but every valid
 * key and its value shape is enumerated here so application code never reads
 * or writes a settings key that isn't documented.
 */
export interface SettingsRegistry {
  "site.name": string;
  "site.tagline": string;
  "site.contact_email": string;
  /** Paisa; empty until the house decides. Saved as text or a number. */
  "wall.early_price_minor": string | number | null;
  "sattal.rate_minor": string | number | null;
  "record.listening_names_days": string | number | null;
  /** Who is told, with no content, that something is waiting. Empty means no one / the contact address. */
  "notify.concerns_email": string | null;
  "notify.desk_email": string | null;
  "house.status": string;
  "house.status_ne": string;
  /** ISO time the status was last set; written by api.set_house_status. */
  "house.status_set_at": string;
  "email.sender_name": string;
  "email.sender_address": string;
}

export type SettingsKey = keyof SettingsRegistry;
