import { sales, expenses, type Sale, type InsertSale, type SalesSummary, type Expense, type InsertExpense, type CashBookSummary } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";

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
}

// 支出データのストレージクラス
export class ExpenseStorage {
  async getExpenses(): Promise<Expense[]> {
    return db.select().from(expenses).orderBy(desc(expenses.createdAt));
  }

  async getExpenseById(id: number): Promise<Expense | undefined> {
    const [expense] = await db.select().from(expenses).where(eq(expenses.id, id));
    return expense || undefined;
  }

  async createExpense(insertExpense: InsertExpense): Promise<Expense> {
    const [expense] = await db.insert(expenses).values(insertExpense).returning();
    return expense;
  }

  async updateExpense(id: number, updateData: Partial<InsertExpense>): Promise<Expense | undefined> {
    const [expense] = await db
      .update(expenses)
      .set(updateData)
      .where(eq(expenses.id, id))
      .returning();
    return expense || undefined;
  }

  async deleteExpense(id: number): Promise<boolean> {
    const result = await db.delete(expenses).where(eq(expenses.id, id)).returning();
    return result.length > 0;
  }

  async getExpensesByDateRange(startDate: string, endDate: string): Promise<Expense[]> {
    return db
      .select()
      .from(expenses)
      .where(and(gte(expenses.date, startDate), lte(expenses.date, endDate)))
      .orderBy(desc(expenses.date));
  }

  async getCashBookSummary(year: number, month: number): Promise<CashBookSummary> {
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = `${year}-${String(month).padStart(2, "0")}-31`;

    // 月間売上（収入）を取得
    const salesResult = await db
      .select({
        total: sql<number>`COALESCE(SUM(${sales.amount}), 0)::int`,
      })
      .from(sales)
      .where(and(gte(sales.date, startDate), lte(sales.date, endDate)));
    
    const income = salesResult[0]?.total || 0;

    // 月間支出を取得
    const expensesResult = await db
      .select({
        total: sql<number>`COALESCE(SUM(${expenses.amount}), 0)::int`,
      })
      .from(expenses)
      .where(and(gte(expenses.date, startDate), lte(expenses.date, endDate)));
    
    const totalExpenses = expensesResult[0]?.total || 0;

    // 月間支出一覧
    const expenseList = await this.getExpensesByDateRange(startDate, endDate);

    return {
      income,
      expenses: totalExpenses,
      balance: income - totalExpenses,
      expenseList,
    };
  }
}

export const storage = new DatabaseStorage();
export const expenseStorage = new ExpenseStorage();
