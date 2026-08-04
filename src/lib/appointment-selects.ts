/**
 * PostgREST embed hints for appointment → profile joins.
 *
 * Migration 014 added appointments.created_by / updated_by → profiles, so
 * `client:profiles(...)` is ambiguous and the query fails (PGRST201).
 * Always use the client_id foreign key explicitly.
 */
const APPOINTMENT_CLIENT_PROFILE =
  "profiles!appointments_client_id_fkey" as const;

/** Admin list / calendar — client name + email + avatar. */
export const ADMIN_APPOINTMENT_LIST_SELECT: string = `
  *,
  client:${APPOINTMENT_CLIENT_PROFILE}(id, full_name, email, avatar_url),
  psychologist:psychologists(*),
  service:services(*),
  payment:payments(*)
`;

/** Admin detail — full client profile. */
export const ADMIN_APPOINTMENT_DETAIL_SELECT: string = `
  *,
  client:${APPOINTMENT_CLIENT_PROFILE}(*),
  psychologist:psychologists(*),
  service:services(*),
  payment:payments(*),
  questionnaire_response:questionnaire_responses(*)
`;

/** Admin list with client avatar. */
export const ADMIN_APPOINTMENT_WITH_AVATAR_SELECT: string = `
  *,
  client:${APPOINTMENT_CLIENT_PROFILE}(id, full_name, email, avatar_url),
  psychologist:psychologists(*),
  service:services(*),
  payment:payments(*)
`;

/** Client directory — appointment history card fields. */
export const ADMIN_APPOINTMENT_CLIENT_CARD_SELECT: string = `
  *,
  client:${APPOINTMENT_CLIENT_PROFILE}(id, full_name, email, phone, avatar_url, created_at),
  psychologist:psychologists(*),
  service:services(*),
  payment:payments(*)
`;

/** Payments list — nested appointment + client. */
export const ADMIN_PAYMENT_LIST_SELECT: string = `
  *,
  appointment:appointments(
    id,
    client:${APPOINTMENT_CLIENT_PROFILE}(id, full_name, email, avatar_url),
    service:services(name)
  )
`;
