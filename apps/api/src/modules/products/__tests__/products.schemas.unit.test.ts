import { describe, it, expect } from "vitest";
import { productListQuerySchema, suggestQuerySchema } from "../products.schemas";

describe("productListQuerySchema", () => {
  it("parses inStock='false' as boolean false, not truthy", () => {
    const r = productListQuerySchema.parse({ inStock: "false" });
    expect(r.inStock).toBe(false);
  });
  it("parses inStock='true' as boolean true", () => {
    const r = productListQuerySchema.parse({ inStock: "true" });
    expect(r.inStock).toBe(true);
  });
  it("leaves inStock undefined when omitted", () => {
    const r = productListQuerySchema.parse({});
    expect(r.inStock).toBeUndefined();
  });
  it("applies default sort, page, and limit", () => {
    const r = productListQuerySchema.parse({});
    expect(r.sort).toBe("newest");
    expect(r.page).toBe(1);
    expect(r.limit).toBe(20);
  });
  it("accepts rating_desc as a valid sort value", () => {
    const r = productListQuerySchema.parse({ sort: "rating_desc" });
    expect(r.sort).toBe("rating_desc");
  });
  it("rejects a minRating above 5", () => {
    expect(productListQuerySchema.safeParse({ minRating: "6" }).success).toBe(false);
  });
  it("rejects a minRating below 1", () => {
    expect(productListQuerySchema.safeParse({ minRating: "0" }).success).toBe(false);
  });
  it("caps limit at 50 and rejects anything higher", () => {
    expect(productListQuerySchema.safeParse({ limit: "500" }).success).toBe(false);
  });
});

describe("suggestQuerySchema", () => {
  it("rejects an empty query string", () => {
    expect(suggestQuerySchema.safeParse({ q: "" }).success).toBe(false);
  });
  it("accepts a normal search term", () => {
    expect(suggestQuerySchema.parse({ q: "phone" }).q).toBe("phone");
  });
});
