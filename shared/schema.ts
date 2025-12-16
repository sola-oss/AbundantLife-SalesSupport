import { z } from "zod";

// 売上データのスキーマ
export const saleSchema = z.object({
  id: z.string(),
  date: z.string(),
  course: z.string(),
  amount: z.number(),
  createdAt: z.string(),
});

export const insertSaleSchema = z.object({
  date: z.string(),
  course: z.string(),
  amount: z.number(),
});

export type Sale = z.infer<typeof saleSchema>;
export type InsertSale = z.infer<typeof insertSaleSchema>;

// 売上集計データのスキーマ
export const salesSummarySchema = z.object({
  todayTotal: z.number(),
  monthTotal: z.number(),
  sales: z.array(saleSchema),
});

export type SalesSummary = z.infer<typeof salesSummarySchema>;

// コース名の選択肢
export const COURSE_OPTIONS = [
  "30分整体",
  "60分整体",
  "90分整体",
  "回数券",
  "その他",
] as const;

export type CourseOption = (typeof COURSE_OPTIONS)[number];
