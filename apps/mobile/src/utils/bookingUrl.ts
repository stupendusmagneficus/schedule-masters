export function buildBookingUrl(baseUrl: string, slug: string): string {
  const url = new URL(baseUrl);
  url.searchParams.set("slug", slug);
  return url.toString();
}

export function buildAppointmentManagementUrl(
  baseUrl: string,
  token: string,
): string {
  const url = new URL(baseUrl);
  return `${url.toString().split("#", 1)[0]}#${new URLSearchParams({ token })}`;
}
