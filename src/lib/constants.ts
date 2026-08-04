export const BRAND_NAME = "TDC LifeCare";
export const BRAND_TAGLINE = "Psychological Center";
export const APP_NAME = BRAND_NAME;
export const CLINIC_TIMEZONE = "Asia/Manila";
export const TIMEZONE_LABEL = "Philippine Time (PHT)";
export const CURRENCY = "PHP";

export const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  pending_payment: "Pending Payment",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
  expired: "Expired",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  paid: "Paid",
  waived: "Waived",
  failed: "Failed",
  refunded: "Refunded",
  expired: "Expired",
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  paymongo: "PayMongo (Online)",
  cash: "Cash",
  gcash_manual: "GCash (Manual)",
  bank_transfer: "Bank Transfer",
  pro_bono: "Pro Bono",
  waived: "Waived",
};

export const UNAVAILABLE_REASON_LABELS: Record<string, string> = {
  lunch_break: "Lunch Break",
  meeting: "Meeting",
  holiday: "Holiday",
  vacation: "Vacation",
  training: "Training",
  administrative: "Administrative Work",
  personal: "Personal Time",
  other: "Other",
  // Legacy
  emergency: "Emergency",
  leave: "Leave",
  clinic_closed: "Clinic Closed",
};

/** Emoji icons for blocked-time hover / display. */
export const UNAVAILABLE_REASON_ICONS: Record<string, string> = {
  lunch_break: "🍽️",
  meeting: "👥",
  holiday: "🏖️",
  vacation: "🏖️",
  training: "🎓",
  administrative: "🖥️",
  personal: "🏠",
  other: "🔒",
  emergency: "🚨",
  leave: "🏖️",
  clinic_closed: "🔒",
};

export const BLOCK_REASON_OPTIONS: { value: string; label: string }[] = [
  { value: "lunch_break", label: "Lunch Break" },
  { value: "meeting", label: "Meeting" },
  { value: "holiday", label: "Holiday" },
  { value: "vacation", label: "Vacation" },
  { value: "training", label: "Training" },
  { value: "administrative", label: "Administrative Work" },
  { value: "personal", label: "Personal Time" },
  { value: "other", label: "Other" },
];

/** Recurring Block repeat options (one-time uses none internally). */
export const BLOCK_REPEAT_OPTIONS: { value: string; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekday", label: "Weekdays" },
  { value: "weekly", label: "Weekly" },
  { value: "custom", label: "Custom" },
];

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
