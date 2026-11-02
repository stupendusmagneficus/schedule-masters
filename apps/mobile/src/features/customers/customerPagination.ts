const PAGE_SIZE = 100;

type CustomerPage<T> = {
  readonly data: T[] | null;
  readonly error: { readonly message: string } | null;
};

export async function collectCustomerPages<T extends { readonly id: string }>(
  fetchPage: (from: number, to: number) => PromiseLike<CustomerPage<T>>,
): Promise<T[]> {
  const rows: T[] = [];
  const seen = new Set<string>();
  for (let from = 0; ; from += PAGE_SIZE) {
    const result = await fetchPage(from, from + PAGE_SIZE - 1);
    if (result.error) throw new Error(result.error.message);
    const page = result.data ?? [];
    let added = 0;
    for (const row of page) {
      if (!seen.has(row.id)) {
        seen.add(row.id);
        rows.push(row);
        added += 1;
      }
    }
    if (page.length < PAGE_SIZE) return rows;
    if (added === 0) throw new Error("Customer pagination did not advance");
  }
}
