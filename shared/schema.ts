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

// 現金出納帳テーブル（手動入力の入金・出金記録）
export const cashbook = pgTable("cashbook", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),
  type: text("type").notNull(), // 'income' | 'expense'
  accountCategory: text("account_category"), // 勘定科目
  client: text("client"), // 取引先
  description: text("description").notNull(),
  amount: integer("amount").notNull(),
  paymentMethod: text("payment_method"),
  saleId: integer("sale_id"), // 売上連携時のID（手動入力はnull）
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 勘定科目の選択肢（入金用）
export const INCOME_ACCOUNT_CATEGORIES = [
  "売上",
  "雑収入",
  "その他",
] as const;

// 勘定科目の選択肢（出金用）
export const EXPENSE_ACCOUNT_CATEGORIES = [
  "給料",
  "法定福利費",
  "雑費",
  "福利厚生費",
  "旅費交通費",
  "交際費",
  "接待交際費",
  "消耗品費",
  "水道光熱費",
  "修繕費",
  "租税公課",
] as const;

// 決済方法の選択肢
export const PAYMENT_METHODS = [
  "現金",
  "PayPay",
  "クレジットカード",
] as const;

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

// 現金出納帳のZodスキーマ
export const insertCashbookSchema = createInsertSchema(cashbook).omit({
  id: true,
  createdAt: true,
  saleId: true,
});

export const selectCashbookSchema = createSelectSchema(cashbook);

export type CashbookEntry = typeof cashbook.$inferSelect;
export type InsertCashbookEntry = z.infer<typeof insertCashbookSchema>;

// 現金出納帳の統合エントリ（売上からの自動入金も含む）
export interface CashbookTransaction {
  id: number;
  date: string;
  type: 'income' | 'expense';
  accountCategory?: string;
  client?: string;
  description: string;
  amount: number;
  paymentMethod?: string;
  balance: number;
  cashBalance: number;
  paypayBalance: number;
  creditBalance: number;
  source: 'manual' | 'sales';
  manualId?: number;
  saleId?: number;
  createdAt: string;
}

// 現金出納帳のサマリー
export interface CashbookSummary {
  transactions: CashbookTransaction[];
  totalIncome: number;
  totalExpense: number;
  balance: number;
  cashBalance: number;
  paypayBalance: number;
  creditBalance: number;
  cashExpense: number;
  paypayExpense: number;
  creditExpense: number;
}

// コース名の選択肢
export const COURSE_OPTIONS = [
  "整体",
  "インディバ ボディー",
  "インディバ フェイシャル",
  "その他",
] as const;

export type CourseOption = (typeof COURSE_OPTIONS)[number];

// コース別の固定金額（その他は手入力）
export const COURSE_PRICES: Record<string, number | null> = {
  "整体": 6000,
  "インディバ ボディー": 6000,
  "インディバ フェイシャル": 10000,
  "その他": null,
};
