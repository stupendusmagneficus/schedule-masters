export function buildBookingUrl(baseUrl: string, slug: string): string {
  const url = new URL(baseUrl);
  url.searchParams.set("slug", slug);
  return url.toString();
}
