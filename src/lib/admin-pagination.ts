export const ADMIN_PAGE_SIZE = 15;

export function parsePage(value?: string) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

export function totalPages(total: number, pageSize = ADMIN_PAGE_SIZE) {
  return Math.max(1, Math.ceil(total / pageSize));
}

export function buildPageHref(
  basePath: string,
  page: number,
  params: Record<string, string | undefined>,
) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  if (page > 1) search.set("page", String(page));
  const qs = search.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
