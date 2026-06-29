import { describe, test, expect } from "vitest";
import { buildHeaders } from "../src/api/client";

describe("buildHeaders", () => {
  test("injects Authorization header", () => {
    const h = buildHeaders("tok123");
    expect(h.Authorization).toBe("Bearer tok123");
  });

  test("merges base headers", () => {
    const h = buildHeaders("tok", { "X-Custom": "val" });
    expect(h["X-Custom"]).toBe("val");
    expect(h.Authorization).toBe("Bearer tok");
    expect(h["Content-Type"]).toBe("application/json");
  });
});
