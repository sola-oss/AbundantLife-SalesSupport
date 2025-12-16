import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { storage } from "./storage";
import { insertSaleSchema } from "@shared/schema";

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

  const httpServer = createServer(app);
  return httpServer;
}
