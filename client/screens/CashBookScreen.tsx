import React, { useState, useMemo } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  FlatList,
  Platform,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { getApiUrl, apiRequest } from "@/lib/query-client";
import type { Expense, CashBookSummary } from "@shared/schema";

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

type ViewMode = "list" | "summary";

export default function CashBookScreen() {
  const theme = Colors.light;
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [vendor, setVendor] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");

  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editDate, setEditDate] = useState(new Date());
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const [editVendor, setEditVendor] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editAmount, setEditAmount] = useState("");

  const { data: cashBookData, refetch } = useQuery<CashBookSummary>({
    queryKey: ["/api/cashbook", selectedYear, selectedMonth],
    queryFn: async () => {
      const res = await fetch(`${getApiUrl()}api/cashbook/${selectedYear}/${selectedMonth}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const createExpenseMutation = useMutation({
    mutationFn: async (data: { date: string; vendor: string; description?: string; amount: number }) => {
      return apiRequest("POST", "/api/expenses", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cashbook"] });
      refetch();
      resetForm();
      setShowAddModal(false);
    },
  });

  const updateExpenseMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<{ date: string; vendor: string; description: string; amount: number }> }) => {
      return apiRequest("PUT", `/api/expenses/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cashbook"] });
      refetch();
      setShowEditModal(false);
      setEditingExpense(null);
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/expenses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cashbook"] });
      refetch();
      setShowDeleteConfirm(false);
      setShowEditModal(false);
      setEditingExpense(null);
    },
  });

  const resetForm = () => {
    setSelectedDate(new Date());
    setVendor("");
    setDescription("");
    setAmount("");
  };

  const handleAmountChange = (text: string) => {
    const numericText = text.replace(/[^0-9]/g, "");
    if (numericText) {
      setAmount(parseInt(numericText, 10).toLocaleString("ja-JP"));
    } else {
      setAmount("");
    }
  };

  const handleEditAmountChange = (text: string) => {
    const numericText = text.replace(/[^0-9]/g, "");
    if (numericText) {
      setEditAmount(parseInt(numericText, 10).toLocaleString("ja-JP"));
    } else {
      setEditAmount("");
    }
  };

  const handleSubmit = () => {
    if (!vendor.trim() || !amount) {
      Alert.alert("入力エラー", "取引先と金額を入力してください");
      return;
    }

    const amountNumber = parseInt(amount.replace(/,/g, ""), 10);
    if (isNaN(amountNumber) || amountNumber <= 0) {
      Alert.alert("入力エラー", "正しい金額を入力してください");
      return;
    }

    createExpenseMutation.mutate({
      date: selectedDate.toISOString().split("T")[0],
      vendor: vendor.trim(),
      description: description.trim() || undefined,
      amount: amountNumber,
    });
  };

  const handleEditSubmit = () => {
    if (!editingExpense) return;

    if (!editVendor.trim() || !editAmount) {
      Alert.alert("入力エラー", "取引先と金額を入力してください");
      return;
    }

    const amountNumber = parseInt(editAmount.replace(/,/g, ""), 10);
    if (isNaN(amountNumber) || amountNumber <= 0) {
      Alert.alert("入力エラー", "正しい金額を入力してください");
      return;
    }

    updateExpenseMutation.mutate({
      id: editingExpense.id,
      data: {
        date: editDate.toISOString().split("T")[0],
        vendor: editVendor.trim(),
        description: editDescription.trim(),
        amount: amountNumber,
      },
    });
  };

  const handleDelete = () => {
    if (!editingExpense) return;
    deleteExpenseMutation.mutate(editingExpense.id);
  };

  const openEditModal = (expense: Expense) => {
    setEditingExpense(expense);
    setEditDate(new Date(expense.date));
    setEditVendor(expense.vendor);
    setEditDescription(expense.description || "");
    setEditAmount(formatAmount(expense.amount));
    setShowEditModal(true);
  };

  const onDateChange = (_event: any, date?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
    if (date) {
      setSelectedDate(date);
    }
  };

  const onEditDateChange = (_event: any, date?: Date) => {
    if (Platform.OS === "android") {
      setShowEditDatePicker(false);
    }
    if (date) {
      setEditDate(date);
    }
  };

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

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  const income = cashBookData?.income || 0;
  const totalExpenses = cashBookData?.expenses || 0;
  const balance = cashBookData?.balance || 0;
  const expenseList = cashBookData?.expenseList || [];

  const renderExpenseItem = ({ item }: { item: Expense }) => (
    <Pressable
      onPress={() => openEditModal(item)}
      style={({ pressed }) => [
        styles.expenseItem,
        { borderBottomColor: theme.border, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View style={styles.expenseItemLeft}>
        <ThemedText style={styles.expenseItemDate}>
          {formatDateJapanese(item.date)}
        </ThemedText>
        <ThemedText style={styles.expenseItemVendor}>
          {item.vendor}
        </ThemedText>
        {item.description ? (
          <ThemedText style={[styles.expenseItemDesc, { color: theme.textSecondary }]}>
            {item.description}
          </ThemedText>
        ) : null}
      </View>
      <ThemedText style={[styles.expenseItemAmount, { color: "#D32F2F" }]}>
        -{formatAmount(item.amount)}円
      </ThemedText>
    </Pressable>
  );

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={expenseList}
        renderItem={renderExpenseItem}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: insets.bottom + 100,
          },
        ]}
        ListHeaderComponent={
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

            <View style={[styles.summaryCard, { backgroundColor: theme.backgroundDefault }]}>
              <View style={styles.summaryRow}>
                <ThemedText style={[styles.summaryLabel, { color: theme.textSecondary }]}>
                  収入（売上）
                </ThemedText>
                <ThemedText style={[styles.summaryAmount, { color: "#2E7D32" }]}>
                  +{formatAmount(income)}円
                </ThemedText>
              </View>
              <View style={styles.summaryRow}>
                <ThemedText style={[styles.summaryLabel, { color: theme.textSecondary }]}>
                  支出
                </ThemedText>
                <ThemedText style={[styles.summaryAmount, { color: "#D32F2F" }]}>
                  -{formatAmount(totalExpenses)}円
                </ThemedText>
              </View>
              <View style={[styles.summaryRow, styles.balanceRow, { borderTopColor: theme.border }]}>
                <ThemedText style={styles.balanceLabel}>
                  残高
                </ThemedText>
                <ThemedText style={[styles.balanceAmount, { color: balance >= 0 ? "#2E7D32" : "#D32F2F" }]}>
                  {balance >= 0 ? "+" : ""}{formatAmount(balance)}円
                </ThemedText>
              </View>
            </View>

            <View style={[styles.sectionHeader, { backgroundColor: theme.backgroundDefault }]}>
              <ThemedText style={styles.sectionTitle}>支出一覧</ThemedText>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={[styles.emptyContainer, { backgroundColor: theme.backgroundDefault }]}>
            <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
              この月の支出データがありません
            </ThemedText>
          </View>
        }
      />

      <Pressable
        onPress={() => setShowAddModal(true)}
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: pressed ? theme.primaryPressed : theme.primary,
            bottom: insets.bottom + 20,
          },
        ]}
      >
        <Feather name="plus" size={28} color={theme.warmBrown} />
      </Pressable>

      <Modal visible={showAddModal} transparent animationType="slide">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowAddModal(false)}
        >
          <Pressable style={[styles.modalContent, { backgroundColor: "#FFFFFF" }]} onPress={(e) => e.stopPropagation()}>
            <KeyboardAwareScrollViewCompat>
              <View style={styles.modalHeader}>
                <ThemedText style={styles.modalTitle}>支出を追加</ThemedText>
                <Pressable onPress={() => setShowAddModal(false)}>
                  <Feather name="x" size={24} color={theme.text} />
                </Pressable>
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>日付</ThemedText>
                {Platform.OS === "web" ? (
                  <input
                    type="date"
                    value={selectedDate.toISOString().split("T")[0]}
                    onChange={(e) => setSelectedDate(new Date(e.target.value))}
                    style={{
                      padding: 16,
                      fontSize: 16,
                      borderRadius: 8,
                      border: `1px solid ${theme.border}`,
                      backgroundColor: theme.backgroundDefault,
                      width: "100%",
                    }}
                  />
                ) : (
                  <Pressable
                    onPress={() => setShowDatePicker(true)}
                    style={[
                      styles.inputField,
                      { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
                    ]}
                  >
                    <ThemedText style={styles.inputText}>
                      {formatDateJapanese(selectedDate.toISOString().split("T")[0])}
                    </ThemedText>
                  </Pressable>
                )}
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>取引先</ThemedText>
                <TextInput
                  style={[
                    styles.inputField,
                    styles.textInput,
                    { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
                  ]}
                  value={vendor}
                  onChangeText={setVendor}
                  placeholder="例: コンビニ、薬局など"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>内容（任意）</ThemedText>
                <TextInput
                  style={[
                    styles.inputField,
                    styles.textInput,
                    { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
                  ]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="例: 文房具、消耗品など"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>金額</ThemedText>
                <View
                  style={[
                    styles.inputField,
                    styles.amountInputContainer,
                    { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
                  ]}
                >
                  <TextInput
                    style={styles.amountInput}
                    value={amount}
                    onChangeText={handleAmountChange}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={theme.textSecondary}
                  />
                  <ThemedText style={styles.currencyLabel}>円</ThemedText>
                </View>
              </View>

              <Pressable
                onPress={handleSubmit}
                disabled={createExpenseMutation.isPending}
                style={({ pressed }) => [
                  styles.submitButton,
                  {
                    backgroundColor: pressed ? theme.primaryPressed : theme.primary,
                    opacity: createExpenseMutation.isPending ? 0.5 : 1,
                  },
                ]}
              >
                <ThemedText style={[styles.submitButtonText, { color: theme.warmBrown }]}>
                  追加
                </ThemedText>
              </Pressable>
            </KeyboardAwareScrollViewCompat>
          </Pressable>
        </Pressable>
      </Modal>

      {Platform.OS === "ios" && showDatePicker ? (
        <Modal transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.pickerModal, { backgroundColor: "#FFFFFF" }]}>
              <View style={styles.pickerHeader}>
                <Pressable onPress={() => setShowDatePicker(false)}>
                  <ThemedText style={[styles.pickerDone, { color: theme.warmBrown }]}>
                    完了
                  </ThemedText>
                </Pressable>
              </View>
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="spinner"
                onChange={onDateChange}
                locale="ja"
              />
            </View>
          </View>
        </Modal>
      ) : null}

      {Platform.OS === "android" && showDatePicker ? (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={onDateChange}
        />
      ) : null}

      <Modal visible={showEditModal} transparent animationType="slide">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowEditModal(false)}
        >
          <Pressable style={[styles.modalContent, { backgroundColor: "#FFFFFF" }]} onPress={(e) => e.stopPropagation()}>
            <KeyboardAwareScrollViewCompat>
              <View style={styles.modalHeader}>
                <ThemedText style={styles.modalTitle}>支出を編集</ThemedText>
                <View style={styles.modalHeaderButtons}>
                  <Pressable
                    onPress={() => setShowDeleteConfirm(true)}
                    style={styles.deleteButton}
                  >
                    <Feather name="trash-2" size={22} color="#D32F2F" />
                  </Pressable>
                  <Pressable onPress={() => setShowEditModal(false)}>
                    <Feather name="x" size={24} color={theme.text} />
                  </Pressable>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>日付</ThemedText>
                {Platform.OS === "web" ? (
                  <input
                    type="date"
                    value={editDate.toISOString().split("T")[0]}
                    onChange={(e) => setEditDate(new Date(e.target.value))}
                    style={{
                      padding: 16,
                      fontSize: 16,
                      borderRadius: 8,
                      border: `1px solid ${theme.border}`,
                      backgroundColor: theme.backgroundDefault,
                      width: "100%",
                    }}
                  />
                ) : (
                  <Pressable
                    onPress={() => setShowEditDatePicker(true)}
                    style={[
                      styles.inputField,
                      { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
                    ]}
                  >
                    <ThemedText style={styles.inputText}>
                      {formatDateJapanese(editDate.toISOString().split("T")[0])}
                    </ThemedText>
                  </Pressable>
                )}
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>取引先</ThemedText>
                <TextInput
                  style={[
                    styles.inputField,
                    styles.textInput,
                    { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
                  ]}
                  value={editVendor}
                  onChangeText={setEditVendor}
                  placeholder="例: コンビニ、薬局など"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>内容（任意）</ThemedText>
                <TextInput
                  style={[
                    styles.inputField,
                    styles.textInput,
                    { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
                  ]}
                  value={editDescription}
                  onChangeText={setEditDescription}
                  placeholder="例: 文房具、消耗品など"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>金額</ThemedText>
                <View
                  style={[
                    styles.inputField,
                    styles.amountInputContainer,
                    { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
                  ]}
                >
                  <TextInput
                    style={styles.amountInput}
                    value={editAmount}
                    onChangeText={handleEditAmountChange}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={theme.textSecondary}
                  />
                  <ThemedText style={styles.currencyLabel}>円</ThemedText>
                </View>
              </View>

              <Pressable
                onPress={handleEditSubmit}
                disabled={updateExpenseMutation.isPending}
                style={({ pressed }) => [
                  styles.submitButton,
                  {
                    backgroundColor: pressed ? theme.primaryPressed : theme.primary,
                    opacity: updateExpenseMutation.isPending ? 0.5 : 1,
                  },
                ]}
              >
                <ThemedText style={[styles.submitButtonText, { color: theme.warmBrown }]}>
                  更新
                </ThemedText>
              </Pressable>
            </KeyboardAwareScrollViewCompat>
          </Pressable>
        </Pressable>
      </Modal>

      {Platform.OS === "ios" && showEditDatePicker ? (
        <Modal transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.pickerModal, { backgroundColor: "#FFFFFF" }]}>
              <View style={styles.pickerHeader}>
                <Pressable onPress={() => setShowEditDatePicker(false)}>
                  <ThemedText style={[styles.pickerDone, { color: theme.warmBrown }]}>
                    完了
                  </ThemedText>
                </Pressable>
              </View>
              <DateTimePicker
                value={editDate}
                mode="date"
                display="spinner"
                onChange={onEditDateChange}
                locale="ja"
              />
            </View>
          </View>
        </Modal>
      ) : null}

      {Platform.OS === "android" && showEditDatePicker ? (
        <DateTimePicker
          value={editDate}
          mode="date"
          display="default"
          onChange={onEditDateChange}
        />
      ) : null}

      <Modal visible={showDeleteConfirm} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={[styles.confirmModal, { backgroundColor: "#FFFFFF" }]}>
            <ThemedText style={styles.confirmTitle}>削除の確認</ThemedText>
            <ThemedText style={[styles.confirmText, { color: theme.textSecondary }]}>
              この支出を削除しますか？
            </ThemedText>
            <View style={styles.confirmButtons}>
              <Pressable
                onPress={() => setShowDeleteConfirm(false)}
                style={[styles.confirmButton, { backgroundColor: theme.backgroundDefault }]}
              >
                <ThemedText style={styles.confirmButtonText}>キャンセル</ThemedText>
              </Pressable>
              <Pressable
                onPress={handleDelete}
                style={[styles.confirmButton, { backgroundColor: "#D32F2F" }]}
              >
                <ThemedText style={[styles.confirmButtonText, { color: "#FFFFFF" }]}>
                  削除
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

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
  summaryCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  summaryLabel: {
    fontSize: 16,
  },
  summaryAmount: {
    fontSize: 20,
    fontWeight: "600",
  },
  balanceRow: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  balanceLabel: {
    fontSize: 18,
    fontWeight: "600",
  },
  balanceAmount: {
    fontSize: 26,
    fontWeight: "700",
  },
  sectionHeader: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: -Spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  expenseItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    backgroundColor: "#F5F1E8",
  },
  expenseItemLeft: {
    flex: 1,
  },
  expenseItemDate: {
    fontSize: 14,
    fontWeight: "500",
  },
  expenseItemVendor: {
    fontSize: 16,
    fontWeight: "500",
    marginTop: 2,
  },
  expenseItemDesc: {
    fontSize: 14,
    marginTop: 2,
  },
  expenseItemAmount: {
    fontSize: 18,
    fontWeight: "600",
  },
  emptyContainer: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
    paddingVertical: Spacing.xl,
  },
  fab: {
    position: "absolute",
    right: Spacing.lg,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    padding: Spacing.lg,
    paddingBottom: Spacing["3xl"],
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  modalHeaderButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  deleteButton: {
    padding: Spacing.xs,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: Spacing.sm,
  },
  inputField: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  textInput: {
    fontSize: 16,
  },
  inputText: {
    fontSize: 16,
  },
  amountInputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: "600",
  },
  currencyLabel: {
    fontSize: 18,
    marginLeft: Spacing.sm,
  },
  submitButton: {
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    marginTop: Spacing.md,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: "600",
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
  confirmOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  confirmModal: {
    width: "80%",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: Spacing.md,
  },
  confirmText: {
    fontSize: 16,
    marginBottom: Spacing.lg,
  },
  confirmButtons: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
