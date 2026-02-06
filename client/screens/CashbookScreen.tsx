import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  FlatList,
  Platform,
  Modal,
  Alert,
  ScrollView,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Feather } from "@expo/vector-icons";
import { File, Paths } from "expo-file-system/next";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";
import type { CashbookSummary, CashbookTransaction } from "@shared/schema";
import { INCOME_ACCOUNT_CATEGORIES, EXPENSE_ACCOUNT_CATEGORIES, PAYMENT_METHODS } from "@shared/schema";

type FilterType = "all" | "income" | "expense";

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

export default function CashbookScreen() {
  const theme = Colors.light;
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [filterType, setFilterType] = useState<FilterType>("all");

  const [showAddModal, setShowAddModal] = useState(false);
  const [addType, setAddType] = useState<"income" | "expense">("expense");
  const [addDate, setAddDate] = useState(new Date());
  const [addAccountCategory, setAddAccountCategory] = useState("");
  const [addClient, setAddClient] = useState("");
  const [addPaymentMethod, setAddPaymentMethod] = useState("");
  const [addDescription, setAddDescription] = useState("");
  const [addAmount, setAddAmount] = useState("");
  const [showAddDatePicker, setShowAddDatePicker] = useState(false);

  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const { data, isLoading } = useQuery<CashbookSummary>({
    queryKey: [`/api/cashbook/${selectedYear}/${selectedMonth}`],
  });

  const createEntryMutation = useMutation({
    mutationFn: async (entryData: {
      date: string;
      type: string;
      accountCategory?: string;
      client?: string;
      paymentMethod?: string;
      description: string;
      amount: number;
    }) => {
      const res = await apiRequest("POST", "/api/cashbook", entryData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/cashbook/${selectedYear}/${selectedMonth}`] });
      setShowAddModal(false);
      resetAddForm();
      setSuccessMessage("登録しました");
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    },
  });

  const deleteEntryMutation = useMutation({
    mutationFn: async (manualId: number) => {
      await apiRequest("DELETE", `/api/cashbook/${manualId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/cashbook/${selectedYear}/${selectedMonth}`] });
      setSuccessMessage("削除しました");
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    },
  });

  const resetAddForm = () => {
    setAddType("expense");
    setAddDate(new Date());
    setAddAccountCategory("");
    setAddClient("");
    setAddPaymentMethod("");
    setAddDescription("");
    setAddAmount("");
  };

  const filteredTransactions = useMemo(() => {
    if (!data?.transactions) return [];
    if (filterType === "all") return data.transactions;
    return data.transactions.filter((tx) => tx.type === filterType);
  }, [data?.transactions, filterType]);

  const handleAddSubmit = useCallback(() => {
    if (!addDescription || !addAmount) return;
    const amountNumber = parseInt(addAmount.replace(/,/g, ""), 10);
    if (isNaN(amountNumber) || amountNumber <= 0) return;

    createEntryMutation.mutate({
      date: addDate.toISOString().split("T")[0],
      type: addType,
      accountCategory: addAccountCategory || undefined,
      client: addClient || undefined,
      paymentMethod: addType === "expense" && addPaymentMethod ? addPaymentMethod : undefined,
      description: addDescription,
      amount: amountNumber,
    });
  }, [addDate, addType, addAccountCategory, addClient, addPaymentMethod, addDescription, addAmount, createEntryMutation]);

  const handleAmountChange = (text: string) => {
    const numericText = text.replace(/[^0-9]/g, "");
    if (numericText) {
      const num = parseInt(numericText, 10);
      setAddAmount(num.toLocaleString("ja-JP"));
    } else {
      setAddAmount("");
    }
  };

  const onAddDateChange = (_event: any, date?: Date) => {
    if (Platform.OS === "android") {
      setShowAddDatePicker(false);
    }
    if (date) {
      setAddDate(date);
    }
  };

  const handleDelete = (tx: CashbookTransaction) => {
    if (tx.source === "sales") {
      if (Platform.OS === "web") {
        window.alert("売上データは売上入力画面から削除してください");
      } else {
        Alert.alert("注意", "売上データは売上入力画面から削除してください");
      }
      return;
    }

    if (!tx.manualId) return;

    if (Platform.OS === "web") {
      if (window.confirm("この取引を削除しますか？")) {
        deleteEntryMutation.mutate(tx.manualId);
      }
    } else {
      Alert.alert("確認", "この取引を削除しますか？", [
        { text: "キャンセル", style: "cancel" },
        {
          text: "削除",
          style: "destructive",
          onPress: () => deleteEntryMutation.mutate(tx.manualId!),
        },
      ]);
    }
  };

  const openAddModal = (type: "income" | "expense") => {
    setAddType(type);
    setAddDate(new Date());
    setShowAddModal(true);
  };

  const generateCSVForMethod = useCallback((method: "現金" | "PayPay") => {
    if (!data?.transactions || data.transactions.length === 0) return "";

    const isCash = method === "現金";
    const filtered = data.transactions.filter((tx) => {
      if (tx.type === "income") return isCash;
      return isCash ? tx.paymentMethod !== "PayPay" : tx.paymentMethod === "PayPay";
    });
    if (filtered.length === 0) return "";

    const header = "日付,勘定科目,取引先,内容,入金,出金,残高\n";
    const rows = filtered.map((tx) => {
      const date = tx.date;
      const accountCategory = (tx.accountCategory || "").replace(/,/g, "，");
      const client = (tx.client || "").replace(/,/g, "，");
      const description = tx.description.replace(/,/g, "，");
      const income = tx.type === "income" ? tx.amount : "";
      const expense = tx.type === "expense" ? tx.amount : "";
      const balance = isCash ? tx.cashBalance : tx.paypayBalance;
      return `${date},${accountCategory},${client},${description},${income},${expense},${balance}`;
    }).join("\n");

    const totalIncome = isCash ? data.totalIncome : 0;
    const totalExpense = isCash ? data.cashExpense : data.paypayExpense;
    const finalBalance = isCash ? data.cashBalance : data.paypayBalance;
    const summary = `\n\n合計,,入金合計,${totalIncome},,\n,,出金合計,,${totalExpense},\n,,残高,,,${finalBalance}`;

    return header + rows + summary;
  }, [data]);

  const downloadCSVWeb = useCallback((csvContent: string, filename: string) => {
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  const handleExportCSV = useCallback(async () => {
    const cashCSV = generateCSVForMethod("現金");
    const paypayCSV = generateCSVForMethod("PayPay");

    if (!cashCSV && !paypayCSV) {
      if (Platform.OS === "web") {
        window.alert("エクスポートするデータがありません");
      } else {
        Alert.alert("注意", "エクスポートするデータがありません");
      }
      return;
    }

    if (Platform.OS === "web") {
      if (cashCSV) {
        downloadCSVWeb(cashCSV, `現金出納帳_現金_${selectedYear}年${selectedMonth}月.csv`);
      }
      if (paypayCSV) {
        setTimeout(() => {
          downloadCSVWeb(paypayCSV, `現金出納帳_PayPay_${selectedYear}年${selectedMonth}月.csv`);
        }, 500);
      }
      const methods = [cashCSV ? "現金" : "", paypayCSV ? "PayPay" : ""].filter(Boolean).join("・");
      setSuccessMessage(`${methods}のCSVをダウンロードしました`);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } else {
      try {
        const files: string[] = [];
        if (cashCSV) {
          const cashFile = new File(Paths.cache, `現金出納帳_現金_${selectedYear}年${selectedMonth}月.csv`);
          await cashFile.create();
          await cashFile.write(cashCSV);
          files.push(cashFile.uri);
        }
        if (paypayCSV) {
          const paypayFile = new File(Paths.cache, `現金出納帳_PayPay_${selectedYear}年${selectedMonth}月.csv`);
          await paypayFile.create();
          await paypayFile.write(paypayCSV);
          files.push(paypayFile.uri);
        }

        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          for (const uri of files) {
            await Sharing.shareAsync(uri, {
              mimeType: "text/csv",
              dialogTitle: "出納帳をエクスポート",
            });
          }
        } else {
          Alert.alert("完了", `ファイルを保存しました`);
        }
      } catch (error) {
        Alert.alert("エラー", "エクスポートに失敗しました");
      }
    }
  }, [generateCSVForMethod, downloadCSVWeb, selectedYear, selectedMonth]);

  const generatePrintHTML = useCallback((method: "現金" | "PayPay") => {
    if (!data?.transactions || data.transactions.length === 0) return "";

    const isCash = method === "現金";
    const filtered = data.transactions.filter((tx) => {
      if (tx.type === "income") return isCash;
      return isCash ? tx.paymentMethod !== "PayPay" : tx.paymentMethod === "PayPay";
    });
    if (filtered.length === 0) return "";

    const tableRows = filtered.map((tx) => {
      const isIncome = tx.type === "income";
      const balance = isCash ? tx.cashBalance : tx.paypayBalance;
      return `
        <tr>
          <td>${tx.date}</td>
          <td>${tx.accountCategory || ""}</td>
          <td>${tx.client || ""}</td>
          <td>${tx.description}</td>
          <td style="color: #4CAF50; text-align: right;">${isIncome ? `¥${formatAmount(tx.amount)}` : ""}</td>
          <td style="color: #E53935; text-align: right;">${!isIncome ? `¥${formatAmount(tx.amount)}` : ""}</td>
          <td style="text-align: right;">¥${formatAmount(balance)}</td>
        </tr>
      `;
    }).join("");

    const totalIncome = isCash ? data.totalIncome : 0;
    const totalExpense = isCash ? data.cashExpense : data.paypayExpense;
    const finalBalance = isCash ? data.cashBalance : data.paypayBalance;
    const title = isCash ? "現金出納帳" : "PayPay出納帳";

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${title} ${selectedYear}年${selectedMonth}月</title>
          <style>
            body { font-family: sans-serif; padding: 20px; }
            h1 { text-align: center; font-size: 24px; margin-bottom: 20px; }
            .summary { display: flex; justify-content: space-around; margin-bottom: 20px; }
            .summary-item { text-align: center; }
            .summary-label { font-size: 14px; color: #666; }
            .summary-value { font-size: 20px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; }
            th { background-color: #f5f5f5; }
            .income { color: #4CAF50; }
            .expense { color: #E53935; }
          </style>
        </head>
        <body>
          <h1>${title} ${selectedYear}年${selectedMonth}月</h1>
          <div class="summary">
            <div class="summary-item">
              <div class="summary-label">入金合計</div>
              <div class="summary-value income">¥${formatAmount(totalIncome)}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">出金合計</div>
              <div class="summary-value expense">¥${formatAmount(totalExpense)}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">残高</div>
              <div class="summary-value">¥${formatAmount(finalBalance)}</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>日付</th>
                <th>勘定科目</th>
                <th>取引先</th>
                <th>内容</th>
                <th>入金</th>
                <th>出金</th>
                <th>残高</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </body>
      </html>
    `;
  }, [data, selectedYear, selectedMonth]);

  const handlePrint = useCallback(async () => {
    if (!data?.transactions || data.transactions.length === 0) {
      if (Platform.OS === "web") {
        window.alert("印刷するデータがありません");
      } else {
        Alert.alert("注意", "印刷するデータがありません");
      }
      return;
    }

    const cashHTML = generatePrintHTML("現金");
    const paypayHTML = generatePrintHTML("PayPay");

    if (!cashHTML && !paypayHTML) {
      if (Platform.OS === "web") {
        window.alert("印刷するデータがありません");
      } else {
        Alert.alert("注意", "印刷するデータがありません");
      }
      return;
    }

    const combinedHTML = [cashHTML, paypayHTML].filter(Boolean).join('<div style="page-break-before: always;"></div>');
    const wrappedHTML = combinedHTML.replace(/<\/html>\s*<!DOCTYPE html>\s*<html>\s*<head>[\s\S]*?<\/head>\s*<body>/g, '<div style="page-break-before: always;">') .replace(/<\/body>\s*<\/html>\s*<div style="page-break-before: always;">/g, '<div style="page-break-before: always;">');

    if (Platform.OS === "web") {
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        if (cashHTML) {
          printWindow.document.write(cashHTML);
        }
        if (paypayHTML) {
          if (cashHTML) {
            printWindow.document.write('<div style="page-break-before: always;"></div>');
            const bodyContent = paypayHTML.match(/<body>([\s\S]*)<\/body>/);
            if (bodyContent) {
              printWindow.document.write(bodyContent[1]);
            }
          } else {
            printWindow.document.write(paypayHTML);
          }
        }
        printWindow.document.close();
        printWindow.print();
      }
    } else {
      try {
        const fullHTML = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: sans-serif; padding: 20px; }
                h1 { text-align: center; font-size: 24px; margin-bottom: 20px; }
                .summary { display: flex; justify-content: space-around; margin-bottom: 20px; }
                .summary-item { text-align: center; }
                .summary-label { font-size: 14px; color: #666; }
                .summary-value { font-size: 20px; font-weight: bold; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #ddd; padding: 8px; }
                th { background-color: #f5f5f5; }
                .income { color: #4CAF50; }
                .expense { color: #E53935; }
              </style>
            </head>
            <body>
              ${cashHTML ? cashHTML.match(/<body>([\s\S]*)<\/body>/)?.[1] || "" : ""}
              ${paypayHTML ? '<div style="page-break-before: always;"></div>' + (paypayHTML.match(/<body>([\s\S]*)<\/body>/)?.[1] || "") : ""}
            </body>
          </html>
        `;
        await Print.printAsync({ html: fullHTML });
      } catch (error) {
        Alert.alert("エラー", "印刷に失敗しました");
      }
    }
  }, [data, generatePrintHTML]);

  const renderTransaction = ({ item }: { item: CashbookTransaction }) => {
    const isIncome = item.type === "income";
    return (
      <Pressable
        style={[styles.transactionItem, { borderBottomColor: theme.border }]}
        onLongPress={() => handleDelete(item)}
      >
        <View style={styles.transactionLeft}>
          <ThemedText style={styles.transactionDate}>
            {formatDateJapanese(item.date)}
          </ThemedText>
          {item.accountCategory && (
            <ThemedText style={[styles.transactionCategory, { color: isIncome ? "#4CAF50" : "#E53935" }]}>
              {item.accountCategory}
            </ThemedText>
          )}
          {item.client && (
            <ThemedText style={[styles.transactionClient, { color: theme.textSecondary }]}>
              {item.client}
            </ThemedText>
          )}
          {item.paymentMethod && (
            <ThemedText style={[styles.transactionClient, { color: theme.textSecondary }]}>
              {item.paymentMethod}
            </ThemedText>
          )}
          <ThemedText style={[styles.transactionDesc, { color: theme.textSecondary }]}>
            {item.description}
            {item.source === "sales" ? " [自動]" : ""}
          </ThemedText>
        </View>
        <View style={styles.transactionRight}>
          <ThemedText
            style={[
              styles.transactionAmount,
              { color: isIncome ? "#4CAF50" : "#E53935" },
            ]}
          >
            {isIncome ? "+" : "-"}¥{formatAmount(item.amount)}
          </ThemedText>
          <ThemedText style={[styles.transactionBalance, { color: theme.textSecondary }]}>
            {item.type === 'expense' && item.paymentMethod === 'PayPay'
              ? `PayPay: ¥${formatAmount(item.paypayBalance)}`
              : `現金: ¥${formatAmount(item.cashBalance)}`}
          </ThemedText>
        </View>
      </Pressable>
    );
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: insets.bottom + Spacing.xl,
          paddingHorizontal: Spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          style={[styles.monthSelector, { backgroundColor: theme.backgroundSecondary }]}
          onPress={() => setShowMonthPicker(true)}
        >
          <ThemedText style={styles.monthText}>
            {selectedYear}年{selectedMonth}月
          </ThemedText>
          <Feather name="chevron-down" size={20} color={theme.text} />
        </Pressable>

        <View style={styles.buttonRow}>
          <Pressable
            style={[styles.addButton, { backgroundColor: "#E8F5E9" }]}
            onPress={() => openAddModal("income")}
          >
            <Feather name="plus" size={18} color="#4CAF50" />
            <ThemedText style={[styles.addButtonText, { color: "#4CAF50" }]}>
              入金追加
            </ThemedText>
          </Pressable>
          <Pressable
            style={[styles.addButton, { backgroundColor: "#FFEBEE" }]}
            onPress={() => openAddModal("expense")}
          >
            <Feather name="minus" size={18} color="#E53935" />
            <ThemedText style={[styles.addButtonText, { color: "#E53935" }]}>
              出金追加
            </ThemedText>
          </Pressable>
        </View>

        <View style={[styles.separator, { backgroundColor: theme.border }]} />

        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: "#E8F5E9" }]}>
            <ThemedText style={[styles.summaryLabel, { color: "#4CAF50" }]}>
              入金
            </ThemedText>
            <ThemedText style={[styles.summaryAmount, { color: "#4CAF50" }]}>
              ¥{formatAmount(data?.totalIncome || 0)}
            </ThemedText>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: "#FFEBEE" }]}>
            <ThemedText style={[styles.summaryLabel, { color: "#E53935" }]}>
              出金
            </ThemedText>
            <ThemedText style={[styles.summaryAmount, { color: "#E53935" }]}>
              ¥{formatAmount(data?.totalExpense || 0)}
            </ThemedText>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <View style={[styles.balanceCard, { backgroundColor: theme.backgroundSecondary, flex: 1 }]}>
            <ThemedText style={styles.balanceLabel}>現金残高</ThemedText>
            <ThemedText style={styles.balanceAmount}>
              ¥{formatAmount(data?.cashBalance || 0)}
            </ThemedText>
          </View>
          <View style={{ width: Spacing.sm }} />
          <View style={[styles.balanceCard, { backgroundColor: theme.backgroundSecondary, flex: 1 }]}>
            <ThemedText style={styles.balanceLabel}>PayPay残高</ThemedText>
            <ThemedText style={styles.balanceAmount}>
              ¥{formatAmount(data?.paypayBalance || 0)}
            </ThemedText>
          </View>
        </View>

        <View style={styles.filterRow}>
          {(["all", "income", "expense"] as FilterType[]).map((type) => (
            <Pressable
              key={type}
              style={[
                styles.filterButton,
                {
                  backgroundColor:
                    filterType === type ? theme.warmBrown : theme.backgroundSecondary,
                },
              ]}
              onPress={() => setFilterType(type)}
            >
              <ThemedText
                style={[
                  styles.filterButtonText,
                  { color: filterType === type ? "#FFF" : theme.text },
                ]}
              >
                {type === "all" ? "すべて" : type === "income" ? "入金" : "出金"}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        <View style={styles.exportRow}>
          <Pressable
            style={[styles.exportButton, { backgroundColor: theme.backgroundSecondary }]}
            onPress={handleExportCSV}
          >
            <Feather name="download" size={18} color={theme.warmBrown} />
            <ThemedText style={[styles.exportButtonText, { color: theme.warmBrown }]}>
              CSV出力
            </ThemedText>
          </Pressable>
          <Pressable
            style={[styles.exportButton, { backgroundColor: theme.backgroundSecondary }]}
            onPress={handlePrint}
          >
            <Feather name="printer" size={18} color={theme.warmBrown} />
            <ThemedText style={[styles.exportButtonText, { color: theme.warmBrown }]}>
              印刷
            </ThemedText>
          </Pressable>
        </View>

        <View style={[styles.listSection, { backgroundColor: theme.backgroundSecondary }]}>
          <ThemedText style={styles.sectionTitle}>取引一覧</ThemedText>
          {isLoading ? (
            <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
              読み込み中...
            </ThemedText>
          ) : filteredTransactions.length === 0 ? (
            <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
              取引データがありません
            </ThemedText>
          ) : (
            <FlatList
              data={filteredTransactions}
              renderItem={renderTransaction}
              keyExtractor={(item) => `${item.source}-${item.manualId || item.saleId || item.id}`}
              scrollEnabled={false}
            />
          )}
        </View>

        <ThemedText style={[styles.hint, { color: theme.textSecondary }]}>
          売上データは自動で入金として反映されます。手動エントリは長押しで削除できます。
        </ThemedText>
      </ScrollView>

      <Modal
        visible={showMonthPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMonthPicker(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowMonthPicker(false)}
        >
          <View
            style={[styles.monthPickerModal, { backgroundColor: theme.backgroundDefault }]}
          >
            <ThemedText style={styles.monthPickerTitle}>年月を選択</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.yearRow}>
                {years.map((year) => (
                  <Pressable
                    key={year}
                    style={[
                      styles.yearButton,
                      {
                        backgroundColor:
                          selectedYear === year ? theme.warmBrown : theme.backgroundSecondary,
                      },
                    ]}
                    onPress={() => setSelectedYear(year)}
                  >
                    <ThemedText
                      style={{ color: selectedYear === year ? "#FFF" : theme.text }}
                    >
                      {year}年
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
            <View style={styles.monthGrid}>
              {months.map((month) => (
                <Pressable
                  key={month}
                  style={[
                    styles.monthButton,
                    {
                      backgroundColor:
                        selectedMonth === month ? theme.warmBrown : theme.backgroundSecondary,
                    },
                  ]}
                  onPress={() => {
                    setSelectedMonth(month);
                    setShowMonthPicker(false);
                  }}
                >
                  <ThemedText
                    style={{ color: selectedMonth === month ? "#FFF" : theme.text }}
                  >
                    {month}月
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={showAddModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setShowAddModal(false)}
          />
          <KeyboardAwareScrollViewCompat>
            <View
              style={[styles.addModal, { backgroundColor: theme.backgroundDefault }]}
            >
              <ThemedText style={styles.addModalTitle}>
                {addType === "income" ? "入金を追加" : "出金を追加"}
              </ThemedText>

              <View style={styles.typeToggle}>
                <Pressable
                  style={[
                    styles.typeButton,
                    { backgroundColor: addType === "income" ? "#E8F5E9" : theme.backgroundSecondary },
                  ]}
                  onPress={() => setAddType("income")}
                >
                  <ThemedText
                    style={{ color: addType === "income" ? "#4CAF50" : theme.text }}
                  >
                    入金
                  </ThemedText>
                </Pressable>
                <Pressable
                  style={[
                    styles.typeButton,
                    { backgroundColor: addType === "expense" ? "#FFEBEE" : theme.backgroundSecondary },
                  ]}
                  onPress={() => setAddType("expense")}
                >
                  <ThemedText
                    style={{ color: addType === "expense" ? "#E53935" : theme.text }}
                  >
                    出金
                  </ThemedText>
                </Pressable>
              </View>

              {Platform.OS === "web" ? (
                <View style={[styles.dateButton, { backgroundColor: theme.backgroundSecondary }]}>
                  <Feather name="calendar" size={20} color={theme.text} />
                  <input
                    type="date"
                    value={addDate.toISOString().split("T")[0]}
                    onChange={(e) => setAddDate(new Date(e.target.value + "T00:00:00"))}
                    style={{
                      border: "none",
                      background: "transparent",
                      fontSize: 16,
                      color: theme.text,
                      marginLeft: 8,
                      outline: "none",
                    }}
                  />
                </View>
              ) : (
                <>
                  <Pressable
                    style={[styles.dateButton, { backgroundColor: theme.backgroundSecondary }]}
                    onPress={() => setShowAddDatePicker(true)}
                  >
                    <Feather name="calendar" size={20} color={theme.text} />
                    <ThemedText style={styles.dateButtonText}>
                      {formatDateJapanese(addDate.toISOString().split("T")[0])}
                    </ThemedText>
                  </Pressable>

                  {showAddDatePicker && (
                    <DateTimePicker
                      value={addDate}
                      mode="date"
                      display={Platform.OS === "ios" ? "inline" : "default"}
                      onChange={onAddDateChange}
                    />
                  )}
                </>
              )}

              <ThemedText style={styles.inputLabel}>勘定科目</ThemedText>
              <View style={styles.categoryRow}>
                {(addType === "income" ? INCOME_ACCOUNT_CATEGORIES : EXPENSE_ACCOUNT_CATEGORIES).map((category) => (
                  <Pressable
                    key={category}
                    style={[
                      styles.categoryButton,
                      {
                        backgroundColor:
                          addAccountCategory === category
                            ? addType === "income" ? "#E8F5E9" : "#FFEBEE"
                            : theme.backgroundSecondary,
                      },
                    ]}
                    onPress={() => setAddAccountCategory(category)}
                  >
                    <ThemedText
                      style={{
                        color:
                          addAccountCategory === category
                            ? addType === "income" ? "#4CAF50" : "#E53935"
                            : theme.text,
                        fontSize: 14,
                      }}
                    >
                      {category}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>

              <ThemedText style={styles.inputLabel}>取引先</ThemedText>
              <TextInput
                style={[
                  styles.textInput,
                  { backgroundColor: theme.backgroundSecondary, color: theme.text },
                ]}
                placeholder="取引先（例：○○様）"
                placeholderTextColor={theme.textSecondary}
                value={addClient}
                onChangeText={setAddClient}
              />

              {addType === "expense" ? (
                <>
                  <ThemedText style={styles.inputLabel}>決済方法</ThemedText>
                  <View style={styles.categoryRow}>
                    {PAYMENT_METHODS.map((method) => (
                      <Pressable
                        key={method}
                        style={[
                          styles.categoryButton,
                          {
                            backgroundColor:
                              addPaymentMethod === method
                                ? "#FFEBEE"
                                : theme.backgroundSecondary,
                          },
                        ]}
                        onPress={() => setAddPaymentMethod(method)}
                      >
                        <ThemedText
                          style={{
                            color:
                              addPaymentMethod === method
                                ? "#E53935"
                                : theme.text,
                            fontSize: 14,
                          }}
                        >
                          {method}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </View>
                </>
              ) : null}

              <ThemedText style={styles.inputLabel}>内容</ThemedText>
              <TextInput
                style={[
                  styles.textInput,
                  { backgroundColor: theme.backgroundSecondary, color: theme.text },
                ]}
                placeholder="内容（例：事務用品購入）"
                placeholderTextColor={theme.textSecondary}
                value={addDescription}
                onChangeText={setAddDescription}
              />

              <ThemedText style={styles.inputLabel}>金額</ThemedText>
              <View
                style={[styles.amountInputContainer, { backgroundColor: theme.backgroundSecondary }]}
              >
                <ThemedText style={styles.currencySymbol}>¥</ThemedText>
                <TextInput
                  style={[styles.amountInput, { color: theme.text }]}
                  placeholder="金額"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="numeric"
                  value={addAmount}
                  onChangeText={handleAmountChange}
                />
              </View>

              <Pressable
                style={[
                  styles.submitButton,
                  {
                    backgroundColor:
                      addDescription && addAmount ? theme.primary : theme.backgroundTertiary,
                  },
                ]}
                onPress={handleAddSubmit}
                disabled={!addDescription || !addAmount || createEntryMutation.isPending}
              >
                <ThemedText
                  style={[
                    styles.submitButtonText,
                    { color: addDescription && addAmount ? theme.warmBrown : theme.textSecondary },
                  ]}
                >
                  {createEntryMutation.isPending ? "登録中..." : "登録"}
                </ThemedText>
              </Pressable>

              <Pressable style={styles.cancelButton} onPress={() => setShowAddModal(false)}>
                <ThemedText style={[styles.cancelButtonText, { color: theme.textSecondary }]}>
                  キャンセル
                </ThemedText>
              </Pressable>
            </View>
          </KeyboardAwareScrollViewCompat>
        </View>
      </Modal>

      {showSuccess && (
        <View style={[styles.successToast, { backgroundColor: theme.success }]}>
          <Feather name="check-circle" size={20} color={theme.warmBrown} />
          <ThemedText style={[styles.successText, { color: theme.warmBrown }]}>
            {successMessage}
          </ThemedText>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  monthSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  monthText: {
    fontSize: 18,
    fontWeight: "600",
  },
  summaryRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  summaryCard: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 14,
    marginBottom: Spacing.xs,
  },
  summaryAmount: {
    fontSize: 20,
    fontWeight: "700",
  },
  balanceCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  balanceLabel: {
    fontSize: 14,
    marginBottom: Spacing.xs,
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: "700",
  },
  filterRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  filterButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  buttonRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  addButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  exportRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  exportButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  exportButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  listSection: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    minHeight: 200,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: Spacing.md,
  },
  emptyText: {
    textAlign: "center",
    paddingVertical: Spacing.xl,
  },
  transactionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  transactionLeft: {
    flex: 1,
  },
  transactionDate: {
    fontSize: 14,
    marginBottom: 2,
  },
  transactionCategory: {
    fontSize: 12,
    fontWeight: "500",
  },
  transactionClient: {
    fontSize: 12,
  },
  transactionDesc: {
    fontSize: 12,
  },
  transactionRight: {
    alignItems: "flex-end",
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: "600",
  },
  transactionBalance: {
    fontSize: 12,
  },
  hint: {
    fontSize: 12,
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  modalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  monthPickerModal: {
    width: "100%",
    maxWidth: 400,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  monthPickerTitle: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  yearRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  yearButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  monthButton: {
    width: "22%",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
  },
  addModal: {
    width: "100%",
    maxWidth: 400,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  addModalTitle: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  typeToggle: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  typeButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  dateButtonText: {
    fontSize: 16,
  },
  textInput: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    fontSize: 16,
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: Spacing.xs,
  },
  categoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  categoryButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  amountInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: "600",
    marginRight: Spacing.sm,
  },
  amountInput: {
    flex: 1,
    fontSize: 20,
  },
  submitButton: {
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButton: {
    paddingVertical: Spacing.md,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 14,
  },
  successToast: {
    position: "absolute",
    bottom: 100,
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  successText: {
    fontSize: 16,
    fontWeight: "500",
  },
  separator: {
    height: 1,
    marginVertical: Spacing.lg,
  },
});
