import { 
  sales, 
  cashbook,
  type Sale, 
  type InsertSale, 
  type SalesSummary,
  type CashbookEntry,
  type InsertCashbookEntry,
  type CashbookTransaction,
  type CashbookSummary
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, sql, asc } from "drizzle-orm";

// 売上データのストレージインターフェース
export interface IStorage {
  getSales(): Promise<Sale[]>;
  getSaleById(id: number): Promise<Sale | undefined>;
  createSale(sale: InsertSale): Promise<Sale>;
  updateSale(id: number, sale: Partial<InsertSale>): Promise<Sale | undefined>;
  deleteSale(id: number): Promise<boolean>;
  getSalesSummary(): Promise<SalesSummary>;
  getSalesByDateRange(startDate: string, endDate: string): Promise<Sale[]>;
  getMonthlySummary(year: number, month: number): Promise<{ date: string; total: number }[]>;
  // 現金出納帳
  getCashbookEntries(): Promise<CashbookEntry[]>;
  createCashbookEntry(entry: InsertCashbookEntry): Promise<CashbookEntry>;
  updateCashbookEntry(id: number, entry: Partial<InsertCashbookEntry>): Promise<CashbookEntry | undefined>;
  deleteCashbookEntry(id: number): Promise<boolean>;
  getCashbookSummary(year: number, month: number): Promise<CashbookSummary>;
}

export class DatabaseStorage implements IStorage {
  async getSales(): Promise<Sale[]> {
    return db.select().from(sales).orderBy(desc(sales.createdAt));
  }

  async getSaleById(id: number): Promise<Sale | undefined> {
    const [sale] = await db.select().from(sales).where(eq(sales.id, id));
    return sale || undefined;
  }

  async createSale(insertSale: InsertSale): Promise<Sale> {
    const [sale] = await db.insert(sales).values(insertSale).returning();
    return sale;
  }

  async updateSale(id: number, updateData: Partial<InsertSale>): Promise<Sale | undefined> {
    const [sale] = await db
      .update(sales)
      .set(updateData)
      .where(eq(sales.id, id))
      .returning();
    return sale || undefined;
  }

  async deleteSale(id: number): Promise<boolean> {
    const result = await db.delete(sales).where(eq(sales.id, id)).returning();
    return result.length > 0;
  }

  async getSalesSummary(): Promise<SalesSummary> {
    const allSales = await this.getSales();
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    let todayTotal = 0;
    let monthTotal = 0;

    for (const sale of allSales) {
      const saleDate = new Date(sale.date);

      if (sale.date === today) {
        todayTotal += sale.amount;
      }

      if (
        saleDate.getFullYear() === currentYear &&
        saleDate.getMonth() === currentMonth
      ) {
        monthTotal += sale.amount;
      }
    }

    return {
      todayTotal,
      monthTotal,
      sales: allSales,
    };
  }

  async getSalesByDateRange(startDate: string, endDate: string): Promise<Sale[]> {
    return db
      .select()
      .from(sales)
      .where(and(gte(sales.date, startDate), lte(sales.date, endDate)))
      .orderBy(desc(sales.date));
  }

  async getMonthlySummary(year: number, month: number): Promise<{ date: string; total: number }[]> {
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = `${year}-${String(month).padStart(2, "0")}-31`;
    
    const result = await db
      .select({
        date: sales.date,
        total: sql<number>`SUM(${sales.amount})::int`,
      })
      .from(sales)
      .where(and(gte(sales.date, startDate), lte(sales.date, endDate)))
      .groupBy(sales.date)
      .orderBy(sales.date);

    return result;
  }

  // 現金出納帳メソッド
  async getCashbookEntries(): Promise<CashbookEntry[]> {
    return db.select().from(cashbook).orderBy(desc(cashbook.createdAt));
  }

  async createCashbookEntry(insertEntry: InsertCashbookEntry): Promise<CashbookEntry> {
    const [entry] = await db.insert(cashbook).values(insertEntry).returning();
    return entry;
  }

  async updateCashbookEntry(id: number, updateData: Partial<InsertCashbookEntry>): Promise<CashbookEntry | undefined> {
    const [entry] = await db
      .update(cashbook)
      .set(updateData)
      .where(eq(cashbook.id, id))
      .returning();
    return entry || undefined;
  }

  async deleteCashbookEntry(id: number): Promise<boolean> {
    const result = await db.delete(cashbook).where(eq(cashbook.id, id)).returning();
    return result.length > 0;
  }

  async getCashbookSummary(year: number, month: number): Promise<CashbookSummary> {
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    // 手動入力の出納帳エントリを取得
    const manualEntries = await db
      .select()
      .from(cashbook)
      .where(and(gte(cashbook.date, startDate), lte(cashbook.date, endDate)))
      .orderBy(asc(cashbook.date), asc(cashbook.createdAt));

    // 売上データを入金として取得
    const salesData = await db
      .select()
      .from(sales)
      .where(and(gte(sales.date, startDate), lte(sales.date, endDate)))
      .orderBy(asc(sales.date), asc(sales.createdAt));

    // 統合してトランザクションリストを作成
    const transactions: CashbookTransaction[] = [];
    let idCounter = 1;

    // 売上を入金として追加
    for (const sale of salesData) {
      transactions.push({
        id: idCounter++,
        date: sale.date,
        type: 'income',
        description: `売上（${sale.course}）`,
        amount: sale.amount,
        balance: 0,
        source: 'sales',
        saleId: sale.id,
        createdAt: sale.createdAt.toISOString(),
      });
    }

    // 手動エントリを追加
    for (const entry of manualEntries) {
      transactions.push({
        id: idCounter++,
        date: entry.date,
        type: entry.type as 'income' | 'expense',
        description: entry.description,
        amount: entry.amount,
        balance: 0,
        source: 'manual',
        manualId: entry.id,
        createdAt: entry.createdAt.toISOString(),
      });
    }

    // 日付と作成日時でソート（安定したソート）
    transactions.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.createdAt.localeCompare(b.createdAt);
    });

    // 残高を計算
    let balance = 0;
    let totalIncome = 0;
    let totalExpense = 0;

    for (const tx of transactions) {
      if (tx.type === 'income') {
        balance += tx.amount;
        totalIncome += tx.amount;
      } else {
        balance -= tx.amount;
        totalExpense += tx.amount;
      }
      tx.balance = balance;
    }

    return {
      transactions,
      totalIncome,
      totalExpense,
      balance,
    };
  }
}

export const storage = new DatabaseStorage();
