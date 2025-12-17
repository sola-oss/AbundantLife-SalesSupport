import React, { useState, useMemo } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  FlatList,
  Platform,
  Modal,
  Linking,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";
import type { Sale, SalesSummary } from "@shared/schema";

function formatDateJapanese(dateString: string): string {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}年${month}月${day}日`;
}

function formatAmount(amount: number): string {
  return amount.toLocaleString("ja-JP");
}

function getMonthName(year: number, month: number): string {
  return `${year}年${month}月`;
}

type ViewMode = "daily" | "monthly" | "monthlySummary" | "courseSummary";

export default function ReportsScreen() {
  const theme = Colors.light;
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();

  const [viewMode, setViewMode] = useState<ViewMode>("daily");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  const { data } = useQuery<SalesSummary>({
    queryKey: ["/api/sales"],
  });

  const filteredSales = useMemo(() => {
    if (!data?.sales) return [];
    return data.sales.filter((sale) => {
      const saleDate = new Date(sale.date);
      return (
        saleDate.getFullYear() === selectedYear &&
        saleDate.getMonth() + 1 === selectedMonth
      );
    });
  }, [data?.sales, selectedYear, selectedMonth]);

  const dailySummary = useMemo(() => {
    const grouped: Record<string, { date: string; total: number; count: number }> = {};
    for (const sale of filteredSales) {
      if (!grouped[sale.date]) {
        grouped[sale.date] = { date: sale.date, total: 0, count: 0 };
      }
      grouped[sale.date].total += sale.amount;
      grouped[sale.date].count += 1;
    }
    return Object.values(grouped).sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredSales]);

  const monthlyTotal = useMemo(() => {
    return filteredSales.reduce((sum, sale) => sum + sale.amount, 0);
  }, [filteredSales]);

  const transactionCount = filteredSales.length;

  const allMonthlySummary = useMemo(() => {
    if (!data?.sales) return [];
    const grouped: Record<string, { yearMonth: string; year: number; month: number; total: number; count: number }> = {};
    for (const sale of data.sales) {
      const saleDate = new Date(sale.date);
      const year = saleDate.getFullYear();
      const month = saleDate.getMonth() + 1;
      const key = `${year}-${String(month).padStart(2, "0")}`;
      if (!grouped[key]) {
        grouped[key] = { yearMonth: key, year, month, total: 0, count: 0 };
      }
      grouped[key].total += sale.amount;
      grouped[key].count += 1;
    }
    return Object.values(grouped).sort((a, b) => b.yearMonth.localeCompare(a.yearMonth));
  }, [data?.sales]);

  const courseSummary = useMemo(() => {
    if (!data?.sales) return [];
    const grouped: Record<string, { course: string; total: number; count: number }> = {};
    for (const sale of data.sales) {
      if (!grouped[sale.course]) {
        grouped[sale.course] = { course: sale.course, total: 0, count: 0 };
      }
      grouped[sale.course].total += sale.amount;
      grouped[sale.course].count += 1;
    }
    return Object.values(grouped).sort((a, b) => b.total - a.total);
  }, [data?.sales]);

  const handleExportCSV = async () => {
    try {
      const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`;
      const endDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-31`;
      const url = `${getApiUrl()}api/sales/export/csv?startDate=${startDate}&endDate=${endDate}`;
      
      if (Platform.OS === "web") {
        window.open(url, "_blank");
      } else {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.error("CSVエクスポートエラー:", error);
    }
  };

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  const goToPreviousMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const renderDailySummaryItem = ({
    item,
  }: {
    item: { date: string; total: number; count: number };
  }) => (
    <View style={[styles.summaryItem, { borderBottomColor: theme.border }]}>
      <View style={styles.summaryItemLeft}>
        <ThemedText style={styles.summaryItemDate}>
          {formatDateJapanese(item.date)}
        </ThemedText>
        <ThemedText style={[styles.summaryItemCount, { color: theme.textSecondary }]}>
          {item.count}件
        </ThemedText>
      </View>
      <ThemedText style={[styles.summaryItemAmount, { color: theme.warmBrown }]}>
        {formatAmount(item.total)}円
      </ThemedText>
    </View>
  );

  const renderSaleItem = ({ item }: { item: Sale }) => (
    <View style={[styles.saleItem, { borderBottomColor: theme.border }]}>
      <View style={styles.saleItemLeft}>
        <ThemedText style={styles.saleItemDate}>
          {formatDateJapanese(item.date)}
        </ThemedText>
        <ThemedText style={[styles.saleItemCourse, { color: theme.textSecondary }]}>
          {item.course}
        </ThemedText>
      </View>
      <ThemedText style={[styles.saleItemAmount, { color: theme.warmBrown }]}>
        {formatAmount(item.amount)}円
      </ThemedText>
    </View>
  );

  const renderMonthlySummaryItem = ({
    item,
  }: {
    item: { yearMonth: string; year: number; month: number; total: number; count: number };
  }) => (
    <View style={[styles.summaryItem, { borderBottomColor: theme.border }]}>
      <View style={styles.summaryItemLeft}>
        <ThemedText style={styles.summaryItemDate}>
          {getMonthName(item.year, item.month)}
        </ThemedText>
        <ThemedText style={[styles.summaryItemCount, { color: theme.textSecondary }]}>
          {item.count}件
        </ThemedText>
      </View>
      <ThemedText style={[styles.summaryItemAmount, { color: theme.warmBrown }]}>
        {formatAmount(item.total)}円
      </ThemedText>
    </View>
  );

  const renderCourseSummaryItem = ({
    item,
  }: {
    item: { course: string; total: number; count: number };
  }) => (
    <View style={[styles.summaryItem, { borderBottomColor: theme.border }]}>
      <View style={styles.summaryItemLeft}>
        <ThemedText style={styles.summaryItemDate}>
          {item.course}
        </ThemedText>
        <ThemedText style={[styles.summaryItemCount, { color: theme.textSecondary }]}>
          {item.count}件
        </ThemedText>
      </View>
      <ThemedText style={[styles.summaryItemAmount, { color: theme.warmBrown }]}>
        {formatAmount(item.total)}円
      </ThemedText>
    </View>
  );

  const getListData = () => {
    switch (viewMode) {
      case "daily":
        return dailySummary;
      case "monthly":
        return filteredSales;
      case "monthlySummary":
        return allMonthlySummary;
      case "courseSummary":
        return courseSummary;
      default:
        return [];
    }
  };

  const getRenderItem = () => {
    switch (viewMode) {
      case "daily":
        return renderDailySummaryItem;
      case "monthly":
        return renderSaleItem;
      case "monthlySummary":
        return renderMonthlySummaryItem;
      case "courseSummary":
        return renderCourseSummaryItem;
      default:
        return renderDailySummaryItem;
    }
  };

  const getKeyExtractor = (item: any, index: number) => {
    switch (viewMode) {
      case "daily":
        return item.date;
      case "monthly":
        return String(item.id);
      case "monthlySummary":
        return item.yearMonth;
      case "courseSummary":
        return item.course;
      default:
        return String(index);
    }
  };

  const getSectionTitle = () => {
    switch (viewMode) {
      case "daily":
        return "日別売上";
      case "monthly":
        return "売上明細";
      case "monthlySummary":
        return "月別集計";
      case "courseSummary":
        return "コース別集計";
      default:
        return "";
    }
  };

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={getListData()}
        renderItem={getRenderItem() as any}
        keyExtractor={getKeyExtractor}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
        ListHeaderComponent={
          <>
            {(viewMode === "daily" || viewMode === "monthly") ? (
              <>
                <View style={styles.monthSelector}>
                  <Pressable onPress={goToPreviousMonth} style={styles.arrowButton}>
                    <Feather name="chevron-left" size={28} color={theme.warmBrown} />
                  </Pressable>
                  <Pressable
                    onPress={() => setShowMonthPicker(true)}
                    style={styles.monthDisplay}
                  >
                    <ThemedText style={styles.monthText}>
                      {getMonthName(selectedYear, selectedMonth)}
                    </ThemedText>
                    <Feather name="chevron-down" size={20} color={theme.textSecondary} />
                  </Pressable>
                  <Pressable onPress={goToNextMonth} style={styles.arrowButton}>
                    <Feather name="chevron-right" size={28} color={theme.warmBrown} />
                  </Pressable>
                </View>

                <View style={[styles.totalCard, { backgroundColor: theme.backgroundDefault }]}>
                  <View style={styles.totalRow}>
                    <ThemedText style={[styles.totalLabel, { color: theme.textSecondary }]}>
                      月間売上
                    </ThemedText>
                    <ThemedText style={[styles.totalAmount, { color: theme.warmBrown }]}>
                      {formatAmount(monthlyTotal)}円
                    </ThemedText>
                  </View>
                  <View style={styles.totalRow}>
                    <ThemedText style={[styles.totalLabel, { color: theme.textSecondary }]}>
                      取引件数
                    </ThemedText>
                    <ThemedText style={[styles.totalCount, { color: theme.text }]}>
                      {transactionCount}件
                    </ThemedText>
                  </View>
                </View>
              </>
            ) : null}

            <View style={styles.viewModeContainer}>
              <View style={styles.viewModeSelector}>
                <Pressable
                  onPress={() => setViewMode("daily")}
                  style={[
                    styles.viewModeButton,
                    viewMode === "daily" && {
                      backgroundColor: theme.primary,
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.viewModeText,
                      viewMode === "daily" && { color: theme.warmBrown, fontWeight: "600" },
                    ]}
                  >
                    日別
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => setViewMode("monthly")}
                  style={[
                    styles.viewModeButton,
                    viewMode === "monthly" && {
                      backgroundColor: theme.primary,
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.viewModeText,
                      viewMode === "monthly" && { color: theme.warmBrown, fontWeight: "600" },
                    ]}
                  >
                    明細
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => setViewMode("monthlySummary")}
                  style={[
                    styles.viewModeButton,
                    viewMode === "monthlySummary" && {
                      backgroundColor: theme.primary,
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.viewModeText,
                      viewMode === "monthlySummary" && { color: theme.warmBrown, fontWeight: "600" },
                    ]}
                  >
                    月別
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => setViewMode("courseSummary")}
                  style={[
                    styles.viewModeButton,
                    viewMode === "courseSummary" && {
                      backgroundColor: theme.primary,
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.viewModeText,
                      viewMode === "courseSummary" && { color: theme.warmBrown, fontWeight: "600" },
                    ]}
                  >
                    コース別
                  </ThemedText>
                </Pressable>
              </View>
            </View>

            <View style={styles.exportRow}>
              <Pressable
                onPress={handleExportCSV}
                style={({ pressed }) => [
                  styles.exportButton,
                  {
                    backgroundColor: pressed ? theme.primaryPressed : theme.primary,
                  },
                ]}
              >
                <Feather name="download" size={18} color={theme.warmBrown} />
                <ThemedText style={[styles.exportButtonText, { color: theme.warmBrown }]}>
                  CSVエクスポート
                </ThemedText>
              </Pressable>
            </View>

            <View style={[styles.listSection, { backgroundColor: theme.backgroundDefault }]}>
              <ThemedText style={styles.sectionTitle}>
                {getSectionTitle()}
              </ThemedText>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={[styles.listSection, { backgroundColor: theme.backgroundDefault }]}>
            <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
              {viewMode === "monthlySummary" || viewMode === "courseSummary"
                ? "データがありません"
                : "この月のデータがありません"}
            </ThemedText>
          </View>
        }
        ListFooterComponent={<View style={{ height: Spacing.xl }} />}
      />

      <Modal visible={showMonthPicker} transparent animationType="slide">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowMonthPicker(false)}
        >
          <View style={[styles.pickerModal, { backgroundColor: "#FFFFFF" }]}>
            <View style={styles.pickerHeader}>
              <ThemedText style={styles.pickerTitle}>月を選択</ThemedText>
              <Pressable onPress={() => setShowMonthPicker(false)}>
                <ThemedText style={[styles.pickerDone, { color: theme.warmBrown }]}>
                  閉じる
                </ThemedText>
              </Pressable>
            </View>

            <ThemedText style={styles.pickerSectionTitle}>年</ThemedText>
            <View style={styles.yearRow}>
              {years.map((year) => (
                <Pressable
                  key={year}
                  onPress={() => setSelectedYear(year)}
                  style={[
                    styles.yearButton,
                    selectedYear === year && { backgroundColor: theme.primary },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.yearButtonText,
                      selectedYear === year && { color: theme.warmBrown, fontWeight: "600" },
                    ]}
                  >
                    {year}
                  </ThemedText>
                </Pressable>
              ))}
            </View>

            <ThemedText style={styles.pickerSectionTitle}>月</ThemedText>
            <View style={styles.monthGrid}>
              {months.map((month) => (
                <Pressable
                  key={month}
                  onPress={() => {
                    setSelectedMonth(month);
                    setShowMonthPicker(false);
                  }}
                  style={[
                    styles.monthButton,
                    selectedMonth === month && { backgroundColor: theme.primary },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.monthButtonText,
                      selectedMonth === month && { color: theme.warmBrown, fontWeight: "600" },
                    ]}
                  >
                    {month}月
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
  },
  monthSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  arrowButton: {
    padding: Spacing.sm,
  },
  monthDisplay: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  monthText: {
    fontSize: 22,
    fontWeight: "600",
    marginRight: Spacing.xs,
  },
  totalCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  totalLabel: {
    fontSize: 16,
  },
  totalAmount: {
    fontSize: 28,
    fontWeight: "700",
  },
  totalCount: {
    fontSize: 20,
    fontWeight: "600",
  },
  viewModeContainer: {
    marginBottom: Spacing.lg,
  },
  viewModeSelector: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  viewModeButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    backgroundColor: "#E5E5E5",
  },
  viewModeText: {
    fontSize: 14,
  },
  exportRow: {
    marginBottom: Spacing.lg,
  },
  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  exportButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  listSection: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: -Spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: Spacing.md,
  },
  summaryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    backgroundColor: "#F5F1E8",
  },
  summaryItemLeft: {
    flex: 1,
  },
  summaryItemDate: {
    fontSize: 16,
    fontWeight: "500",
  },
  summaryItemCount: {
    fontSize: 14,
    marginTop: 2,
  },
  summaryItemAmount: {
    fontSize: 18,
    fontWeight: "600",
  },
  saleItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    backgroundColor: "#F5F1E8",
  },
  saleItemLeft: {
    flex: 1,
  },
  saleItemDate: {
    fontSize: 16,
    fontWeight: "500",
  },
  saleItemCourse: {
    fontSize: 14,
    marginTop: 2,
  },
  saleItemAmount: {
    fontSize: 18,
    fontWeight: "600",
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
    paddingVertical: Spacing.xl,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  pickerModal: {
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    paddingBottom: Spacing["3xl"],
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: "#E0D5C7",
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  pickerDone: {
    fontSize: 18,
    fontWeight: "600",
  },
  pickerSectionTitle: {
    fontSize: 16,
    fontWeight: "500",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  yearRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  yearButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
    backgroundColor: "#E5E5E5",
  },
  yearButtonText: {
    fontSize: 16,
  },
  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  monthButton: {
    width: "22%",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    backgroundColor: "#E5E5E5",
  },
  monthButtonText: {
    fontSize: 16,
  },
});
