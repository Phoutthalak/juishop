export const STAFF_KEY = "pos-staff";

export function getStaffName(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(STAFF_KEY)?.trim() ?? "";
}

export function setStaffName(name: string) {
  sessionStorage.setItem(STAFF_KEY, name.trim());
}

export function clearStaff() {
  sessionStorage.removeItem(STAFF_KEY);
}
