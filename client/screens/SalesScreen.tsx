import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  FlatList,
  Platform,
  Modal,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DateTimePicker from "@react-native-community/datetimepicker";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";
import { COURSE_OPTIONS, type Sale, type SalesSummary } from "@shared/schema";

// 日付を日本語形式でフォーマット
function formatDateJapanese(dateString: string): string {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}年${month}月${day}日`;
}

// 金額をフォーマット
function formatAmount(amount: number): string {
  return amount.toLocaleString("ja-JP");
}

// 今日の日付をYYYY-MM-DD形式で取得
function getTodayString(): string {
  const today = new Date();
  return today.toISOString().split("T")[0];
}

export default function SalesScreen() {
  const theme = Colors.light;
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  // 入力フォームの状態
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [showCoursePicker, setShowCoursePicker] = useState(false);
  const [amount, setAmount] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  // 売上データを取得
  const { data, isLoading } = useQuery<SalesSummary>({
    queryKey: ["/api/sales"],
  });

  // 売上を登録
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
      // フォームをリセット
      setSelectedDate(new Date());
      setSelectedCourse("");
      setAmount("");
      // 保存完了メッセージを表示
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    },
  });

  // 登録ボタンを押したとき
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

  // 日付ピッカーの値が変わったとき
  const onDateChange = (_event: any, date?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
    if (date) {
      setSelectedDate(date);
    }
  };

  // 金額入力の処理
  const handleAmountChange = (text: string) => {
    const numericText = text.replace(/[^0-9]/g, "");
    if (numericText) {
      const num = parseInt(numericText, 10);
      setAmount(num.toLocaleString("ja-JP"));
    } else {
      setAmount("");
    }
  };

  // 売上一覧のアイテムをレンダリング
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
        {/* 保存完了メッセージ */}
        {showSuccess ? (
          <View style={[styles.successBanner, { backgroundColor: theme.success }]}>
            <ThemedText style={styles.successText}>保存しました</ThemedText>
          </View>
        ) : null}

        {/* 売上入力フォーム */}
        <View style={[styles.formCard, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText style={styles.sectionTitle}>売上入力</ThemedText>

          {/* 日付選択 */}
          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>日付</ThemedText>
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
          </View>

          {/* コース名選択 */}
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

          {/* 金額入力 */}
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

          {/* 登録ボタン */}
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

        {/* 売上集計 */}
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

        {/* 売上一覧 */}
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
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          ) : (
            <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
              まだ売上データがありません
            </ThemedText>
          )}
        </View>
      </KeyboardAwareScrollViewCompat>

      {/* 日付ピッカー（iOS用モーダル） */}
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

      {/* 日付ピッカー（Android） */}
      {Platform.OS === "android" && showDatePicker ? (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={onDateChange}
        />
      ) : null}

      {/* コース選択モーダル */}
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
});
