export function isValidBookingEmail(email: string): boolean {
  const normalized = email.trim();
  return (
    normalized.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
  );
}
