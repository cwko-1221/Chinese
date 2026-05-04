import { describe, expect, it } from "vitest";
import { normalizeAssignmentItems, publishAssignmentSchema } from "@/lib/assignment";

const fiveItems = [
  { traditionalText: "你好", englishMeaning: "Hello" },
  { traditionalText: "學校", englishMeaning: "School" },
  { traditionalText: "巴士", englishMeaning: "Bus" },
  { traditionalText: "紅色", englishMeaning: "Red" },
  { traditionalText: "麵包", englishMeaning: "Bread" },
];

describe("assignment validation", () => {
  it("requires exactly five items", () => {
    expect(() =>
      publishAssignmentSchema.parse({ title: "練習", classId: "00000000-0000-0000-0000-000000000000", items: fiveItems.slice(0, 4) }),
    ).toThrow();
  });

  it("adds order index and jyutping", () => {
    const rows = normalizeAssignmentItems(fiveItems);
    expect(rows).toHaveLength(5);
    expect(rows[0].order_index).toBe(1);
    expect(rows[0].jyutping).toContain("nei");
  });
});
