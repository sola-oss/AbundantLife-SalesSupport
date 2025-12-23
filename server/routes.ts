import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { storage } from "./storage";
import { insertSaleSchema, insertCashbookSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // 売上一覧と集計を取得
  app.get("/api/sales", async (_req, res) => {
    try {
      const summary = await storage.getSalesSummary();
      res.json(summary);
    } catch (error) {
      console.error("売上取得エラー:", error);
      res.status(500).json({ message: "売上データの取得に失敗しました" });
    }
  });

  // 売上を登録
  app.post("/api/sales", async (req, res) => {
    try {
      const parsed = insertSaleSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "入力データが正しくありません" });
      }

      const sale = await storage.createSale(parsed.data);
      res.status(201).json(sale);
    } catch (error) {
      console.error("売上登録エラー:", error);
      res.status(500).json({ message: "売上の登録に失敗しました" });
    }
  });

  // 売上を更新
  app.put("/api/sales/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "無効なIDです" });
      }

      const parsed = insertSaleSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "入力データが正しくありません" });
      }

      const sale = await storage.updateSale(id, parsed.data);
      if (!sale) {
        return res.status(404).json({ message: "売上データが見つかりません" });
      }

      res.json(sale);
    } catch (error) {
      console.error("売上更新エラー:", error);
      res.status(500).json({ message: "売上の更新に失敗しました" });
    }
  });

  // 売上を削除
  app.delete("/api/sales/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "無効なIDです" });
      }

      const deleted = await storage.deleteSale(id);
      if (!deleted) {
        return res.status(404).json({ message: "売上データが見つかりません" });
      }

      res.json({ message: "削除しました" });
    } catch (error) {
      console.error("売上削除エラー:", error);
      res.status(500).json({ message: "売上の削除に失敗しました" });
    }
  });

  // 日付範囲で売上を取得
  app.get("/api/sales/range", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      if (typeof startDate !== "string" || typeof endDate !== "string") {
        return res.status(400).json({ message: "startDateとendDateが必要です" });
      }

      const sales = await storage.getSalesByDateRange(startDate, endDate);
      res.json(sales);
    } catch (error) {
      console.error("売上範囲取得エラー:", error);
      res.status(500).json({ message: "売上データの取得に失敗しました" });
    }
  });

  // 月別集計を取得
  app.get("/api/sales/monthly/:year/:month", async (req, res) => {
    try {
      const year = parseInt(req.params.year, 10);
      const month = parseInt(req.params.month, 10);

      if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
        return res.status(400).json({ message: "無効な年月です" });
      }

      const summary = await storage.getMonthlySummary(year, month);
      res.json(summary);
    } catch (error) {
      console.error("月別集計エラー:", error);
      res.status(500).json({ message: "月別集計の取得に失敗しました" });
    }
  });

  // CSVエクスポート
  app.get("/api/sales/export/csv", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      let sales;
      if (typeof startDate === "string" && typeof endDate === "string") {
        sales = await storage.getSalesByDateRange(startDate, endDate);
      } else {
        sales = await storage.getSales();
      }

      // CSVヘッダー
      const csvHeader = "日付,コース名,金額（税込）,登録日時\n";
      
      // CSVデータ
      const csvData = sales.map(sale => {
        const createdAt = new Date(sale.createdAt).toLocaleString("ja-JP");
        return `${sale.date},${sale.course},${sale.amount},${createdAt}`;
      }).join("\n");

      const csv = csvHeader + csvData;

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=sales_export.csv");
      // BOM for Excel
      res.send("\uFEFF" + csv);
    } catch (error) {
      console.error("CSVエクスポートエラー:", error);
      res.status(500).json({ message: "CSVエクスポートに失敗しました" });
    }
  });

  // 現金出納帳サマリーを取得
  app.get("/api/cashbook/:year/:month", async (req, res) => {
    try {
      const year = parseInt(req.params.year, 10);
      const month = parseInt(req.params.month, 10);

      if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
        return res.status(400).json({ message: "無効な年月です" });
      }

      const summary = await storage.getCashbookSummary(year, month);
      res.json(summary);
    } catch (error) {
      console.error("出納帳取得エラー:", error);
      res.status(500).json({ message: "出納帳データの取得に失敗しました" });
    }
  });

  // 手動エントリを登録
  app.post("/api/cashbook", async (req, res) => {
    try {
      const parsed = insertCashbookSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "入力データが正しくありません" });
      }

      const entry = await storage.createCashbookEntry(parsed.data);
      res.status(201).json(entry);
    } catch (error) {
      console.error("出納帳登録エラー:", error);
      res.status(500).json({ message: "出納帳の登録に失敗しました" });
    }
  });

  // 手動エントリを更新
  app.put("/api/cashbook/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "無効なIDです" });
      }

      const parsed = insertCashbookSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "入力データが正しくありません" });
      }

      const entry = await storage.updateCashbookEntry(id, parsed.data);
      if (!entry) {
        return res.status(404).json({ message: "出納帳データが見つかりません" });
      }

      res.json(entry);
    } catch (error) {
      console.error("出納帳更新エラー:", error);
      res.status(500).json({ message: "出納帳の更新に失敗しました" });
    }
  });

  // 手動エントリを削除
  app.delete("/api/cashbook/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "無効なIDです" });
      }

      const deleted = await storage.deleteCashbookEntry(id);
      if (!deleted) {
        return res.status(404).json({ message: "出納帳データが見つかりません" });
      }

      res.json({ message: "削除しました" });
    } catch (error) {
      console.error("出納帳削除エラー:", error);
      res.status(500).json({ message: "出納帳の削除に失敗しました" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
