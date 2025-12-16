import { Platform } from "react-native";

// 整体サービス売上管理アプリ用のやさしい色
const softBeige = "#F5F1E8";
const paleGreen = "#D4E7D4";
const warmBrown = "#8B7355";
const primaryText = "#3E3E3E";
const secondaryText = "#6B6B6B";
const borderColor = "#E0D5C7";
const successGreen = "#9FC99F";
const pressedGreen = "#C5DCC5";

export const Colors = {
  light: {
    text: primaryText,
    textSecondary: secondaryText,
    buttonText: warmBrown,
    tabIconDefault: "#687076",
    tabIconSelected: warmBrown,
    link: warmBrown,
    backgroundRoot: "#FFFFFF",
    backgroundDefault: softBeige,
    backgroundSecondary: "#EDE8DC",
    backgroundTertiary: "#E5DFD3",
    primary: paleGreen,
    primaryPressed: pressedGreen,
    border: borderColor,
    success: successGreen,
    warmBrown: warmBrown,
  },
  dark: {
    text: primaryText,
    textSecondary: secondaryText,
    buttonText: warmBrown,
    tabIconDefault: "#687076",
    tabIconSelected: warmBrown,
    link: warmBrown,
    backgroundRoot: "#FFFFFF",
    backgroundDefault: softBeige,
    backgroundSecondary: "#EDE8DC",
    backgroundTertiary: "#E5DFD3",
    primary: paleGreen,
    primaryPressed: pressedGreen,
    border: borderColor,
    success: successGreen,
    warmBrown: warmBrown,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 40,
  "4xl": 48,
  "5xl": 56,
  inputHeight: 56,
  buttonHeight: 56,
};

export const BorderRadius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  "2xl": 32,
  "3xl": 40,
  full: 9999,
};

export const Typography = {
  h1: {
    fontSize: 32,
    fontWeight: "700" as const,
  },
  h2: {
    fontSize: 28,
    fontWeight: "700" as const,
  },
  h3: {
    fontSize: 24,
    fontWeight: "600" as const,
  },
  h4: {
    fontSize: 20,
    fontWeight: "600" as const,
  },
  body: {
    fontSize: 18,
    fontWeight: "400" as const,
  },
  small: {
    fontSize: 16,
    fontWeight: "400" as const,
  },
  link: {
    fontSize: 18,
    fontWeight: "400" as const,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
