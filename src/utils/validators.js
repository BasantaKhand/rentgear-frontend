// Client-side validators mirroring the backend rules (defense in depth). The
// server remains the source of truth; these just give faster, inline feedback.

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_REGEX = /^[+]?[\d\s()-]{7,20}$/;
export const NAME_REGEX = /^[a-zA-Z0-9\s'.-]{2,50}$/;

export const isValidEmail = (v = '') => EMAIL_REGEX.test(String(v).trim());
export const isValidPhone = (v = '') => PHONE_REGEX.test(String(v).trim());
export const isValidName = (v = '') => NAME_REGEX.test(String(v).trim());
