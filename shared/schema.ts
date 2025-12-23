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
  "整体①",
  "整体②",
  "その他",
] as const;

export type CourseOption = (typeof COURSE_OPTIONS)[number];

// コース別の固定金額（その他は手入力）
export const COURSE_PRICES: Record<string, number | null> = {
  "整体①": 6000,
  "整体②": 10000,
  "その他": null,
};

// 支出テーブル
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),
  vendor: text("vendor").notNull(),
  description: text("description"),
  amount: integer("amount").notNull(),
  receiptImage: text("receipt_image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 支出用Zodスキーマ
export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
  createdAt: true,
});

export const selectExpenseSchema = createSelectSchema(expenses);

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;

// 出納帳サマリーの型
export interface CashBookSummary {
  income: number;
  expenses: number;
  balance: number;
  expenseList: Expense[];
}
