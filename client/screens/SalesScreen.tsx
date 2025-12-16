import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  FlatList,
  Platform,
  Modal,
  Alert,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";
import { COURSE_OPTIONS, type Sale, type SalesSummary } from "@shared/schema";

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

export default function SalesScreen() {
  const theme = Colors.light;
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [showCoursePicker, setShowCoursePicker] = useState(false);
  const [amount, setAmount] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("保存しました");

  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editDate, setEditDate] = useState(new Date());
  const [editCourse, setEditCourse] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const [showEditCoursePicker, setShowEditCoursePicker] = useState(false);

  const { data, isLoading } = useQuery<SalesSummary>({
    queryKey: ["/api/sales"],
  });

  const createSaleMutation = useMutation({
    mutationFn: async (saleData: {
      date: string;
      course: string;
      amount: number;
    }) => {
      const res = await apiRequest("POST", "/api/sales", saleData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      setSelectedDate(new Date());
      setSelectedCourse("");
      setAmount("");
      setSuccessMessage("保存しました");
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    },
  });

  const updateSaleMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: { date?: string; course?: string; amount?: number };
    }) => {
      const res = await apiRequest("PUT", `/api/sales/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      setShowEditModal(false);
      setEditingSale(null);
      setSuccessMessage("更新しました");
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    },
  });

  const deleteSaleMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/sales/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      setSuccessMessage("削除しました");
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    },
  });

  const handleSubmit = useCallback(() => {
    if (!selectedCourse || !amount) {
      return;
    }
    const amountNumber = parseInt(amount.replace(/,/g, ""), 10);
    if (isNaN(amountNumber) || amountNumber <= 0) {
      return;
    }
    createSaleMutation.mutate({
      date: selectedDate.toISOString().split("T")[0],
      course: selectedCourse,
      amount: amountNumber,
    });
  }, [selectedDate, selectedCourse, amount, createSaleMutation]);

  const onDateChange = (_event: any, date?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleAmountChange = (text: string) => {
    const numericText = text.replace(/[^0-9]/g, "");
    if (numericText) {
      const num = parseInt(numericText, 10);
      setAmount(num.toLocaleString("ja-JP"));
    } else {
      setAmount("");
    }
  };

  const openEditModal = (sale: Sale) => {
    setEditingSale(sale);
    setEditDate(new Date(sale.date));
    setEditCourse(sale.course);
    setEditAmount(sale.amount.toLocaleString("ja-JP"));
    setShowEditModal(true);
  };

  const handleEditSubmit = () => {
    if (!editingSale || !editCourse || !editAmount) return;
    const amountNumber = parseInt(editAmount.replace(/,/g, ""), 10);
    if (isNaN(amountNumber) || amountNumber <= 0) return;

    updateSaleMutation.mutate({
      id: editingSale.id,
      data: {
        date: editDate.toISOString().split("T")[0],
        course: editCourse,
        amount: amountNumber,
      },
    });
  };

  const handleDelete = (sale: Sale) => {
    if (Platform.OS === "web") {
      if (window.confirm("この売上データを削除しますか？")) {
        deleteSaleMutation.mutate(sale.id);
      }
    } else {
      Alert.alert("確認", "この売上データを削除しますか？", [
        { text: "キャンセル", style: "cancel" },
        {
          text: "削除",
          style: "destructive",
          onPress: () => deleteSaleMutation.mutate(sale.id),
        },
      ]);
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

  const handleEditAmountChange = (text: string) => {
    const numericText = text.replace(/[^0-9]/g, "");
    if (numericText) {
      const num = parseInt(numericText, 10);
      setEditAmount(num.toLocaleString("ja-JP"));
    } else {
      setEditAmount("");
    }
  };

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
      <View style={styles.saleItemRight}>
        <ThemedText style={[styles.saleItemAmount, { color: theme.warmBrown }]}>
          {formatAmount(item.amount)}円
        </ThemedText>
        <View style={styles.actionButtons}>
          <Pressable
            onPress={() => openEditModal(item)}
            style={({ pressed }) => [
              styles.iconButton,
              pressed && { opacity: 0.6 },
            ]}
          >
            <Feather name="edit-2" size={18} color={theme.warmBrown} />
          </Pressable>
          <Pressable
            onPress={() => handleDelete(item)}
            style={({ pressed }) => [
              styles.iconButton,
              pressed && { opacity: 0.6 },
            ]}
          >
            <Feather name="trash-2" size={18} color="#CC6666" />
          </Pressable>
        </View>
      </View>
    </View>
  );

  const isSubmitDisabled =
    !selectedCourse || !amount || createSaleMutation.isPending;

  return (
    <ThemedView style={styles.container}>
      <KeyboardAwareScrollViewCompat
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {showSuccess ? (
          <View style={[styles.successBanner, { backgroundColor: theme.success }]}>
            <ThemedText style={styles.successText}>{successMessage}</ThemedText>
          </View>
        ) : null}

        <View style={[styles.formCard, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText style={styles.sectionTitle}>売上入力</ThemedText>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>日付</ThemedText>
            {Platform.OS === "web" ? (
              <View
                style={[
                  styles.inputField,
                  { backgroundColor: "#FFFFFF", borderColor: theme.border },
                ]}
              >
                <input
                  type="date"
                  value={selectedDate.toISOString().split("T")[0]}
                  onChange={(e) => {
                    const newDate = new Date(e.target.value);
                    if (!isNaN(newDate.getTime())) {
                      setSelectedDate(newDate);
                    }
                  }}
                  style={{
                    border: "none",
                    background: "transparent",
                    fontSize: 18,
                    width: "100%",
                    height: "100%",
                    outline: "none",
                    fontFamily: "inherit",
                  }}
                />
              </View>
            ) : (
              <Pressable
                onPress={() => setShowDatePicker(true)}
                style={[
                  styles.inputField,
                  { backgroundColor: "#FFFFFF", borderColor: theme.border },
                ]}
              >
                <ThemedText style={styles.inputText}>
                  {formatDateJapanese(selectedDate.toISOString().split("T")[0])}
                </ThemedText>
              </Pressable>
            )}
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>コース名</ThemedText>
            <Pressable
              onPress={() => setShowCoursePicker(true)}
              style={[
                styles.inputField,
                { backgroundColor: "#FFFFFF", borderColor: theme.border },
              ]}
            >
              <ThemedText
                style={[
                  styles.inputText,
                  !selectedCourse && { color: theme.textSecondary },
                ]}
              >
                {selectedCourse || "選択してください"}
              </ThemedText>
            </Pressable>
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>金額（税込）</ThemedText>
            <View
              style={[
                styles.inputField,
                styles.amountInputContainer,
                { backgroundColor: "#FFFFFF", borderColor: theme.border },
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
            disabled={isSubmitDisabled}
            style={({ pressed }) => [
              styles.submitButton,
              {
                backgroundColor: pressed ? theme.primaryPressed : theme.primary,
                opacity: isSubmitDisabled ? 0.5 : 1,
              },
            ]}
          >
            <ThemedText style={[styles.submitButtonText, { color: theme.warmBrown }]}>
              登録
            </ThemedText>
          </Pressable>
        </View>

        <View style={styles.summarySection}>
          <View style={[styles.summaryCard, { backgroundColor: theme.backgroundDefault }]}>
            <ThemedText style={[styles.summaryLabel, { color: theme.textSecondary }]}>
              今日の売上
            </ThemedText>
            <ThemedText style={[styles.summaryAmount, { color: theme.warmBrown }]}>
              {formatAmount(data?.todayTotal ?? 0)}円
            </ThemedText>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: theme.backgroundDefault }]}>
            <ThemedText style={[styles.summaryLabel, { color: theme.textSecondary }]}>
              今月の売上
            </ThemedText>
            <ThemedText style={[styles.summaryAmount, { color: theme.warmBrown }]}>
              {formatAmount(data?.monthTotal ?? 0)}円
            </ThemedText>
          </View>
        </View>

        <View style={[styles.listSection, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText style={styles.sectionTitle}>売上一覧</ThemedText>
          {isLoading ? (
            <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
              読み込み中...
            </ThemedText>
          ) : data?.sales && data.sales.length > 0 ? (
            <FlatList
              data={data.sales}
              renderItem={renderSaleItem}
              keyExtractor={(item) => String(item.id)}
              scrollEnabled={false}
            />
          ) : (
            <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
              まだ売上データがありません
            </ThemedText>
          )}
        </View>
      </KeyboardAwareScrollViewCompat>

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

      <Modal visible={showCoursePicker} transparent animationType="slide">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowCoursePicker(false)}
        >
          <View style={[styles.pickerModal, { backgroundColor: "#FFFFFF" }]}>
            <View style={styles.pickerHeader}>
              <ThemedText style={styles.pickerTitle}>コースを選択</ThemedText>
              <Pressable onPress={() => setShowCoursePicker(false)}>
                <ThemedText style={[styles.pickerDone, { color: theme.warmBrown }]}>
                  閉じる
                </ThemedText>
              </Pressable>
            </View>
            {COURSE_OPTIONS.map((course) => (
              <Pressable
                key={course}
                style={({ pressed }) => [
                  styles.courseOption,
                  {
                    backgroundColor: pressed ? theme.backgroundDefault : "#FFFFFF",
                    borderBottomColor: theme.border,
                  },
                ]}
                onPress={() => {
                  setSelectedCourse(course);
                  setShowCoursePicker(false);
                }}
              >
                <ThemedText
                  style={[
                    styles.courseOptionText,
                    selectedCourse === course && { color: theme.warmBrown, fontWeight: "600" },
                  ]}
                >
                  {course}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      <Modal visible={showEditModal} transparent animationType="slide">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowEditModal(false)}
        >
          <Pressable
            style={[styles.editModal, { backgroundColor: "#FFFFFF" }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.editModalHeader}>
              <ThemedText style={styles.editModalTitle}>売上を編集</ThemedText>
              <Pressable onPress={() => setShowEditModal(false)}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>日付</ThemedText>
              {Platform.OS === "web" ? (
                <View
                  style={[
                    styles.inputField,
                    { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
                  ]}
                >
                  <input
                    type="date"
                    value={editDate.toISOString().split("T")[0]}
                    onChange={(e) => {
                      const newDate = new Date(e.target.value);
                      if (!isNaN(newDate.getTime())) {
                        setEditDate(newDate);
                      }
                    }}
                    style={{
                      border: "none",
                      background: "transparent",
                      fontSize: 18,
                      width: "100%",
                      height: "100%",
                      outline: "none",
                      fontFamily: "inherit",
                    }}
                  />
                </View>
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
              <ThemedText style={styles.inputLabel}>コース名</ThemedText>
              <Pressable
                onPress={() => setShowEditCoursePicker(true)}
                style={[
                  styles.inputField,
                  { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
                ]}
              >
                <ThemedText style={styles.inputText}>{editCourse}</ThemedText>
              </Pressable>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>金額（税込）</ThemedText>
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
              disabled={updateSaleMutation.isPending}
              style={({ pressed }) => [
                styles.submitButton,
                {
                  backgroundColor: pressed ? theme.primaryPressed : theme.primary,
                  opacity: updateSaleMutation.isPending ? 0.5 : 1,
                },
              ]}
            >
              <ThemedText style={[styles.submitButtonText, { color: theme.warmBrown }]}>
                更新
              </ThemedText>
            </Pressable>
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

      <Modal visible={showEditCoursePicker} transparent animationType="slide">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowEditCoursePicker(false)}
        >
          <View style={[styles.pickerModal, { backgroundColor: "#FFFFFF" }]}>
            <View style={styles.pickerHeader}>
              <ThemedText style={styles.pickerTitle}>コースを選択</ThemedText>
              <Pressable onPress={() => setShowEditCoursePicker(false)}>
                <ThemedText style={[styles.pickerDone, { color: theme.warmBrown }]}>
                  閉じる
                </ThemedText>
              </Pressable>
            </View>
            {COURSE_OPTIONS.map((course) => (
              <Pressable
                key={course}
                style={({ pressed }) => [
                  styles.courseOption,
                  {
                    backgroundColor: pressed ? theme.backgroundDefault : "#FFFFFF",
                    borderBottomColor: theme.border,
                  },
                ]}
                onPress={() => {
                  setEditCourse(course);
                  setShowEditCoursePicker(false);
                }}
              >
                <ThemedText
                  style={[
                    styles.courseOptionText,
                    editCourse === course && { color: theme.warmBrown, fontWeight: "600" },
                  ]}
                >
                  {course}
                </ThemedText>
              </Pressable>
            ))}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  successBanner: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.lg,
    alignItems: "center",
  },
  successText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  formCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: Spacing.lg,
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
    height: Spacing.inputHeight,
    borderWidth: 2,
    borderRadius: BorderRadius.xs,
    paddingHorizontal: Spacing.lg,
    justifyContent: "center",
  },
  inputText: {
    fontSize: 18,
  },
  amountInputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    height: "100%",
  },
  currencyLabel: {
    fontSize: 18,
    marginLeft: Spacing.sm,
  },
  submitButton: {
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.sm,
  },
  submitButtonText: {
    fontSize: 20,
    fontWeight: "700",
  },
  summarySection: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  summaryCard: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 16,
    marginBottom: Spacing.sm,
  },
  summaryAmount: {
    fontSize: 24,
    fontWeight: "700",
  },
  listSection: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    minHeight: 200,
  },
  saleItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  saleItemLeft: {
    flex: 1,
  },
  saleItemRight: {
    alignItems: "flex-end",
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
  actionButtons: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  iconButton: {
    padding: Spacing.xs,
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
    paddingBottom: Spacing["2xl"],
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
  courseOption: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderBottomWidth: 1,
  },
  courseOptionText: {
    fontSize: 18,
  },
  editModal: {
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    padding: Spacing.lg,
    paddingBottom: Spacing["3xl"],
  },
  editModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  editModalTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
});
