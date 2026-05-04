import { describe, expect, it } from "vitest";
import { speechScore } from "@/lib/scoring";

describe("speechScore", () => {
  it("accepts exact transcript", () => {
    expect(speechScore("你好", "你好").correct).toBe(true);
  });

  it("accepts transcript containing the expected text", () => {
    expect(speechScore("我講你好", "你好").correct).toBe(true);
  });

  it("rejects unrelated transcript", () => {
    expect(speechScore("學校", "你好").correct).toBe(false);
  });
});
