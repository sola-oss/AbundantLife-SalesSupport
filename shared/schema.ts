import { pgTable, text, integer, timestamp, serial } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// 売上テーブル
export const sales = pgTable("sales", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),
  course: text("course").notNull(),
  amount: integer("amount").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Zodスキーマ
export const insertSaleSchema = createInsertSchema(sales).omit({
  id: true,
  createdAt: true,
});

export const selectSaleSchema = createSelectSchema(sales);

export type Sale = typeof sales.$inferSelect;
export type InsertSale = z.infer<typeof insertSaleSchema>;

// 売上集計データの型
export interface SalesSummary {
  todayTotal: number;
  monthTotal: number;
  sales: Sale[];
}

// コース名の選択肢
export const COURSE_OPTIONS = [
  "30分整体",
  "60分整体",
  "90分整体",
  "回数券",
  "その他",
] as const;

export type CourseOption = (typeof COURSE_OPTIONS)[number];
