import { z } from "zod";
import { jyutping } from "@/lib/jyutping";

export const assignmentItemSchema = z.object({
  traditionalText: z.string().trim().min(1, "請輸入中文"),
  englishMeaning: z.string().trim().min(1, "請輸入英文意思"),
});

export const publishAssignmentSchema = z.object({
  title: z.string().trim().min(1, "請輸入練習名稱"),
  classId: z.string().uuid("請選擇班級"),
  items: z.array(assignmentItemSchema).length(5, "必須剛好 5 題"),
});

export type PublishAssignmentInput = z.infer<typeof publishAssignmentSchema>;

export function normalizeAssignmentItems(items: PublishAssignmentInput["items"]) {
  return items.map((item, index) => ({
    traditional_text: item.traditionalText,
    english_meaning: item.englishMeaning,
    jyutping: jyutping(item.traditionalText),
    order_index: index + 1,
  }));
}
