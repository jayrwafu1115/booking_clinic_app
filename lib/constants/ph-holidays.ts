// Philippines national and special holidays.
// Source: Proclamation No. 727 (2024) and 368 (2025) — Republic of the Philippines.
// This is a static list. Clinic owners can edit/override via blocked_dates.
// To add support for a future year, append a new array and update getPhHolidays().

export type PhHolidayType = "regular" | "special_non_working" | "special_working";

export type PhHoliday = {
  name: string;
  date: string; // YYYY-MM-DD
  type: PhHolidayType;
};

export const PH_HOLIDAYS_2025: PhHoliday[] = [
  { name: "New Year's Day", date: "2025-01-01", type: "regular" },
  { name: "Chinese New Year", date: "2025-01-29", type: "special_non_working" },
  { name: "EDSA People Power Revolution Anniversary", date: "2025-02-25", type: "special_non_working" },
  { name: "Maundy Thursday", date: "2025-04-17", type: "regular" },
  { name: "Good Friday", date: "2025-04-18", type: "regular" },
  { name: "Black Saturday", date: "2025-04-19", type: "special_non_working" },
  { name: "Araw ng Kagitingan (Day of Valor)", date: "2025-04-09", type: "regular" },
  { name: "Labor Day", date: "2025-05-01", type: "regular" },
  { name: "Independence Day", date: "2025-06-12", type: "regular" },
  { name: "Eid'l Adha (Feast of the Sacrifice)", date: "2025-06-07", type: "regular" },
  { name: "Ninoy Aquino Day", date: "2025-08-21", type: "special_non_working" },
  { name: "National Heroes Day", date: "2025-08-25", type: "regular" },
  { name: "All Saints' Day", date: "2025-11-01", type: "special_non_working" },
  { name: "All Souls' Day", date: "2025-11-02", type: "special_non_working" },
  { name: "Bonifacio Day", date: "2025-11-30", type: "regular" },
  { name: "Feast of the Immaculate Conception", date: "2025-12-08", type: "special_non_working" },
  { name: "Christmas Eve", date: "2025-12-24", type: "special_non_working" },
  { name: "Christmas Day", date: "2025-12-25", type: "regular" },
  { name: "Rizal Day", date: "2025-12-30", type: "regular" },
  { name: "New Year's Eve", date: "2025-12-31", type: "special_non_working" }
];

export const PH_HOLIDAYS_2026: PhHoliday[] = [
  { name: "New Year's Day", date: "2026-01-01", type: "regular" },
  { name: "Chinese New Year", date: "2026-02-17", type: "special_non_working" },
  { name: "EDSA People Power Revolution Anniversary", date: "2026-02-25", type: "special_non_working" },
  { name: "Araw ng Kagitingan (Day of Valor)", date: "2026-04-09", type: "regular" },
  { name: "Maundy Thursday", date: "2026-04-02", type: "regular" },
  { name: "Good Friday", date: "2026-04-03", type: "regular" },
  { name: "Black Saturday", date: "2026-04-04", type: "special_non_working" },
  { name: "Labor Day", date: "2026-05-01", type: "regular" },
  { name: "Independence Day", date: "2026-06-12", type: "regular" },
  { name: "Ninoy Aquino Day", date: "2026-08-21", type: "special_non_working" },
  { name: "National Heroes Day", date: "2026-08-31", type: "regular" },
  { name: "All Saints' Day", date: "2026-11-01", type: "special_non_working" },
  { name: "All Souls' Day", date: "2026-11-02", type: "special_non_working" },
  { name: "Bonifacio Day", date: "2026-11-30", type: "regular" },
  { name: "Feast of the Immaculate Conception", date: "2026-12-08", type: "special_non_working" },
  { name: "Christmas Eve", date: "2026-12-24", type: "special_non_working" },
  { name: "Christmas Day", date: "2026-12-25", type: "regular" },
  { name: "Rizal Day", date: "2026-12-30", type: "regular" },
  { name: "New Year's Eve", date: "2026-12-31", type: "special_non_working" }
];

export function getPhHolidays(year: number): PhHoliday[] {
  if (year === 2025) return PH_HOLIDAYS_2025;
  if (year === 2026) return PH_HOLIDAYS_2026;
  return [];
}

export const SUPPORTED_HOLIDAY_YEARS = [2025, 2026] as const;
export type SupportedHolidayYear = (typeof SUPPORTED_HOLIDAY_YEARS)[number];
