import { describe, expect, it, vi } from "vitest";
import { collectCustomerPages } from "./customerPagination";

describe("customer pagination", () => {
  it("collects all pages beyond the API row limit", async () => {
    const rows = Array.from({ length: 201 }, (_, i) => ({ id: String(i) }));
    const fetchPage = vi.fn(async (from: number, to: number) => ({
      data: rows.slice(from, to + 1),
      error: null,
    }));
    expect(await collectCustomerPages(fetchPage)).toEqual(rows);
    expect(fetchPage).toHaveBeenCalledTimes(3);
  });
  it("does not return incomplete results after a later page fails", async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({
        data: Array.from({ length: 100 }, (_, i) => ({ id: i })),
        error: null,
      })
      .mockResolvedValueOnce({ data: null, error: { message: "Unavailable" } });
    await expect(collectCustomerPages(fetchPage)).rejects.toThrow(
      "Unavailable",
    );
  });
  it("stops if the server repeats a full page", async () => {
    const rows = Array.from({ length: 100 }, (_, i) => ({ id: String(i) }));
    await expect(
      collectCustomerPages(async () => ({ data: rows, error: null })),
    ).rejects.toThrow("did not advance");
  });
});
