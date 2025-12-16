# Design Guidelines: 整体サービス売上管理アプリ

## Architecture Decisions

### Authentication
**No Authentication Required**
- This is a single-user, local business tool
- Data is stored locally (memory database initially)
- **No login, signup, or account screens**
- **No profile/settings screen needed** (per explicit user requirement)

### Navigation
**Stack-Only Navigation**
- Single main screen (売上入力・表示画面)
- No tabs, no drawer
- Ultra-minimal navigation structure matching "レジ感覚" (register-like) concept

### Screen Specifications

#### メイン画面（売上入力・表示）
**Purpose:** Combined sales input and display screen - user can input new sales and view totals/history all in one place

**Layout:**
- **Header:** None (maximize screen space for content)
- **Main content area:** 
  - Scrollable view with vertical single-column layout
  - Top section: Sales input form (3 fields only)
  - Middle section: Today's total and This month's total (large, prominent)
  - Bottom section: Sales list (chronological, read-only)
- **Safe Area Insets:**
  - Top: `insets.top + Spacing.xl`
  - Bottom: `insets.bottom + Spacing.xl`
  - Horizontal: `Spacing.xl`

**Components:**
1. **売上入力フォーム** (Sales Input Form)
   - 日付選択 (Date picker with default = today)
   - コース名選択 (Dropdown: 30分整体, 60分整体, 90分整体, 回数券, その他)
   - 金額入力 (Numeric input, tax-included)
   - 登録ボタン (Single large submit button)
   
2. **売上集計表示** (Sales Summary)
   - 今日の売上 (Today's total - large, prominent card)
   - 今月の売上 (This month's total - large, prominent card)
   
3. **売上一覧** (Sales List)
   - Simple list showing: date, course name, amount
   - No edit/delete functionality
   - Chronological order (newest first)

4. **確認メッセージ** (Confirmation)
   - "保存しました" toast/banner after successful registration
   - Auto-clear form after submission

## Design System

### Color Palette
**Primary Colors:**
- Base White: `#FFFFFF`
- Soft Beige: `#F5F1E8` (backgrounds, cards)
- Pale Green: `#D4E7D4` (accent, highlights, success states)
- Warm Brown: `#8B7355` (text, borders)

**Text Colors:**
- Primary Text: `#3E3E3E` (very dark gray, warm tone)
- Secondary Text: `#6B6B6B` (medium gray)
- Disabled Text: `#A8A8A8`

**Semantic Colors:**
- Success: `#9FC99F` (pale green variant)
- Border: `#E0D5C7` (light beige-brown)

### Typography
**All text MUST be in Japanese - NO English allowed**

**Font Sizes (minimum 16px):**
- Extra Large (Numbers/Totals): 32px, bold
- Large (Section Headers): 24px, bold  
- Medium (Labels): 18px, regular
- Body (Input, List Items): 16px, regular
- Small (Captions): 16px, regular (never go below 16px)

**Font Family:**
- System default Japanese font (Noto Sans JP fallback if needed)

### Visual Design

**Cards/Containers:**
- Background: Soft Beige `#F5F1E8`
- Border radius: 12px (rounded corners for gentleness)
- Padding: 16px minimum
- Border: 1px solid `#E0D5C7` (subtle)
- No drop shadows (keep it simple and flat)

**Input Fields:**
- Background: White `#FFFFFF`
- Border: 2px solid `#E0D5C7` (thicker for visibility)
- Border radius: 8px
- Padding: 12px vertical, 16px horizontal
- Font size: 18px (larger for easier reading)
- Active state: Border color changes to `#9FC99F`

**Buttons:**
- Primary (登録ボタン):
  - Background: Pale Green `#D4E7D4`
  - Text: Warm Brown `#8B7355`
  - Font size: 20px, bold
  - Padding: 16px vertical
  - Border radius: 12px
  - Full width
  - Pressed state: Background darkens to `#C5DCC5`
  - No shadow

**Dropdown (コース名選択):**
- Same styling as input fields
- Large touch target (minimum 48px height)
- Clear visual indicator for selection

**Date Picker:**
- Native platform picker when tapped
- Display formatted Japanese date (例: 2024年1月15日)

### Interaction Design

**Touch Targets:**
- Minimum 48px height for all interactive elements
- Generous padding around touchable areas

**Feedback:**
- Visual feedback on all touchable elements (color change on press)
- "保存しました" message appears for 2 seconds after registration
- Form auto-clears after successful submission

**Input Flow:**
1. User taps date → Calendar picker appears
2. User taps course dropdown → Selection menu appears
3. User taps amount → Numeric keyboard appears
4. User taps 登録 → Save, show confirmation, clear form, refresh totals

### Accessibility Requirements

**For 50-year-old, non-tech-savvy users:**
- Extra large text sizes (never below 16px)
- High contrast ratios (minimum 4.5:1)
- Large touch targets (minimum 48px)
- Simple, linear flow (no complex navigation)
- Clear visual hierarchy
- Generous spacing between elements (minimum 12px)
- Native platform components for familiarity

**Spacing Scale:**
- xs: 4px
- sm: 8px
- md: 12px
- lg: 16px
- xl: 24px
- xxl: 32px

### Layout Patterns

**Vertical Single Column:**
- All content stacked vertically
- Full width minus horizontal padding
- Clear visual separation between sections
- Spacing between sections: 24px minimum

**Section Order (Top to Bottom):**
1. 売上入力フォーム (Input Form)
2. 今日の売上 (Today's Total)
3. 今月の売上 (This Month's Total)
4. 売上一覧 (Sales List)

### Assets
**No custom assets required** - use native platform components and solid colors only to maintain simplicity and quick load times.