import { type Sale, type InsertSale } from "@shared/schema";
import { randomUUID } from "crypto";

// 売上データのストレージインターフェース
export interface IStorage {
  getSales(): Promise<Sale[]>;
  createSale(sale: InsertSale): Promise<Sale>;
  getSalesSummary(): Promise<{
    todayTotal: number;
    monthTotal: number;
    sales: Sale[];
  }>;
}

export class MemStorage implements IStorage {
  private sales: Map<string, Sale>;

  constructor() {
    this.sales = new Map();
  }

  async getSales(): Promise<Sale[]> {
    const salesArray = Array.from(this.sales.values());
    return salesArray.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async createSale(insertSale: InsertSale): Promise<Sale> {
    const id = randomUUID();
    const sale: Sale = {
      ...insertSale,
      id,
      createdAt: new Date().toISOString(),
    };
    this.sales.set(id, sale);
    return sale;
  }

  async getSalesSummary(): Promise<{
    todayTotal: number;
    monthTotal: number;
    sales: Sale[];
  }> {
    const sales = await this.getSales();
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    let todayTotal = 0;
    let monthTotal = 0;

    for (const sale of sales) {
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
      sales,
    };
  }
}

export const storage = new MemStorage();
