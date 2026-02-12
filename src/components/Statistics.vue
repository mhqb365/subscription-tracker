<script setup>
import { computed } from "vue";
import { iconPaths } from "../icons";

const props = defineProps({
  subscriptions: {
    type: Array,
    required: true,
  },
});

/**
 * Hàm trung tâm để tính toán lịch sử thanh toán của một gói
 * Trả về danh sách các ngày billing trong một khoảng thời gian
 */
function getPaymentEvents(sub, rangeStart, rangeEnd) {
  const events = [];
  let currentBillDate = new Date(sub.startDate);
  currentBillDate.setHours(0, 0, 0, 0);

  const pStart = new Date(rangeStart);
  pStart.setHours(0, 0, 0, 0);

  const pEnd = new Date(rangeEnd);
  pEnd.setHours(23, 59, 59, 999);

  // Xác định điểm dừng của gói:
  // 1. Nếu có ngày ngưng duy trì (stopDate) -> Phải dừng tại đó
  // 2. Nếu là Inactive hoặc không AutoRenew -> Dừng tại ngày Expiry
  // 3. Nếu là Active + AutoRenew -> Chạy đến vô hạn (hoặc pEnd)
  let stopDate;
  if (sub.stopDate) {
    stopDate = new Date(sub.stopDate);
  } else {
    stopDate = new Date(sub.expiry);
  }
  stopDate.setHours(23, 59, 59, 999);

  const isInfinite =
    sub.isActive !== false &&
    sub.status === "ACTIVE" &&
    sub.autoRenew &&
    !sub.stopDate;

  while (currentBillDate <= pEnd) {
    // Nếu không phải vô hạn mà vượt quá ngày hết hạn -> Dừng
    if (!isInfinite && currentBillDate > stopDate) break;

    if (currentBillDate >= pStart && currentBillDate <= pEnd) {
      events.push(new Date(currentBillDate));
    }

    const cycle = sub.cycle || "Monthly";
    if (cycle === "Monthly" || cycle === "Gói tháng")
      currentBillDate.setMonth(currentBillDate.getMonth() + 1);
    else if (cycle === "Quarterly" || cycle === "Gói Quý")
      currentBillDate.setMonth(currentBillDate.getMonth() + 3);
    else if (cycle === "Semi-Annually" || cycle === "Gói 6 tháng")
      currentBillDate.setMonth(currentBillDate.getMonth() + 6);
    else if (cycle === "Annually" || cycle === "Gói Năm")
      currentBillDate.setFullYear(currentBillDate.getFullYear() + 1);
    else currentBillDate.setMonth(currentBillDate.getMonth() + 1);

    // Safety break
    if (currentBillDate.getFullYear() > new Date().getFullYear() + 5) break;
  }
  return events;
}

const calculateTotalByPeriod = (period) => {
  const now = new Date();
  let rangeStart, rangeEnd;

  switch (period) {
    case "month":
      rangeStart = new Date(now.getFullYear(), now.getMonth(), 1);
      rangeEnd = now;
      break;
    case "quarter":
      const quarter = Math.floor(now.getMonth() / 3);
      rangeStart = new Date(now.getFullYear(), quarter * 3, 1);
      rangeEnd = now;
      break;
    case "year":
      rangeStart = new Date(now.getFullYear(), 0, 1);
      rangeEnd = now;
      break;
    case "all":
      rangeStart = new Date(0);
      rangeEnd = now;
      break;
  }

  let total = 0;
  props.subscriptions.forEach((sub) => {
    let amount = Number(sub.price) || 0;
    if (sub.currency === "USD") {
      amount = amount * 25400;
    }

    // Đếm số lần thanh toán trong khoảng thời gian này
    const payments = getPaymentEvents(sub, rangeStart, rangeEnd);
    total += payments.length * amount;
  });

  return total;
};

const stats = computed(() => [
  {
    label: "This Month",
    value: calculateTotalByPeriod("month"),
    icon: "calendar",
    color: "#6366f1",
  },
  {
    label: "This Quarter",
    value: calculateTotalByPeriod("quarter"),
    icon: "chart",
    color: "#8b5cf6",
  },
  {
    label: "This Year",
    value: calculateTotalByPeriod("year"),
    icon: "trending",
    color: "#ec4899",
  },
  {
    label: "Total Paid",
    value: calculateTotalByPeriod("all"),
    icon: "dollar",
    color: "#10b981",
  },
]);

// Spending by category (Monthly avg)
const spendingByCategory = computed(() => {
  const categoryMap = {};

  props.subscriptions.forEach((sub) => {
    if (sub.isActive === false) return;

    if (!categoryMap[sub.category]) {
      categoryMap[sub.category] = {
        category: sub.category,
        total: 0,
        count: 0,
        subscriptions: [],
      };
    }

    let monthlyAmount = Number(sub.price) || 0;
    if (sub.currency === "USD") {
      monthlyAmount = monthlyAmount * 25400;
    }

    const cycle = sub.cycle || "Monthly";
    if (cycle === "Quarterly" || cycle === "Gói Quý")
      monthlyAmount = monthlyAmount / 3;
    if (cycle === "Semi-Annually" || cycle === "Gói 6 tháng")
      monthlyAmount = monthlyAmount / 6;
    if (cycle === "Annually" || cycle === "Gói Năm")
      monthlyAmount = monthlyAmount / 12;

    categoryMap[sub.category].total += monthlyAmount;
    categoryMap[sub.category].count++;
    categoryMap[sub.category].subscriptions.push(sub.name);
  });

  return Object.values(categoryMap).sort((a, b) => b.total - a.total);
});

// Top expensive subscriptions
const topExpensive = computed(() => {
  return [...props.subscriptions]
    .filter((s) => s.isActive !== false)
    .map((sub) => {
      let monthlyAmount = Number(sub.price) || 0;
      if (sub.currency === "USD") {
        monthlyAmount = monthlyAmount * 25400;
      }

      const cycle = sub.cycle || "Monthly";
      if (cycle === "Quarterly" || cycle === "Gói Quý")
        monthlyAmount = monthlyAmount / 3;
      if (cycle === "Semi-Annually" || cycle === "Gói 6 tháng")
        monthlyAmount = monthlyAmount / 6;
      if (cycle === "Annually" || cycle === "Gói Năm")
        monthlyAmount = monthlyAmount / 12;

      return { ...sub, monthlyAmount };
    })
    .sort((a, b) => b.monthlyAmount - a.monthlyAmount)
    .slice(0, 5);
});

// Calculate total paid for each subscription since start accurately
const totalPaidPerSubscription = computed(() => {
  const now = new Date();

  return [...props.subscriptions]
    .map((sub) => {
      let amount = Number(sub.price) || 0;
      if (sub.currency === "USD") {
        amount = amount * 25400;
      }

      // Đếm chính xác số lần thanh toán từ đầu đến giờ
      const payments = getPaymentEvents(sub, new Date(0), now);
      const totalPaid = amount * payments.length;

      const subStart = new Date(sub.startDate);
      const daysSinceStart = Math.floor(
        (now - subStart) / (1000 * 60 * 60 * 24),
      );

      return {
        ...sub,
        totalPaid,
        cycleCount: payments.length,
        daysSinceStart,
      };
    })
    .filter((sub) => sub.totalPaid > 0)
    .sort((a, b) => b.totalPaid - a.totalPaid);
});

function formatCurrency(amount) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
}

function getCategoryColor(category) {
  const colors = {
    dev: "#6366f1",
    design: "#ec4899",
    entertainment: "#f59e0b",
    cloud: "#3b82f6",
    security: "#10b981",
    utilities: "#eab308",
    internet: "#06b6d4",
    productivity: "#8b5cf6",
    other: "#6b7280",
    credit: "#f43f5e",
  };
  return colors[category] || "#6b7280";
}
</script>

<template>
  <div class="statistics-page fade-in">
    <header class="page-header">
      <div>
        <h1>Spending Statistics</h1>
      </div>
    </header>

    <!-- Period Stats -->
    <section class="stats-grid">
      <article
        v-for="stat in stats"
        :key="stat.label"
        class="stat-card"
        :style="{ '--card-color': stat.color }"
      >
        <div class="stat-icon">
          <svg viewBox="0 0 24 24">
            <path :d="iconPaths[stat.icon]" />
          </svg>
        </div>
        <div class="stat-content">
          <div class="stat-label">{{ stat.label }}</div>
          <div class="stat-value">{{ formatCurrency(stat.value) }}</div>
        </div>
      </article>
    </section>

    <!-- Category Breakdown -->
    <section class="section">
      <h2 class="section-title">Spend by Category</h2>
      <div class="category-list">
        <article
          v-for="cat in spendingByCategory"
          :key="cat.category"
          class="category-card"
        >
          <div class="category-header">
            <div class="category-info">
              <div
                class="category-dot"
                :style="{ background: getCategoryColor(cat.category) }"
              ></div>
              <div>
                <div class="category-name">{{ cat.category }}</div>
                <div class="category-count">{{ cat.count }} services</div>
              </div>
            </div>
            <div class="category-amount">
              {{ formatCurrency(cat.total) }}/mo
            </div>
          </div>
          <div class="category-subs">
            <span
              v-for="(subName, idx) in cat.subscriptions"
              :key="idx"
              class="sub-tag"
            >
              {{ subName }}
            </span>
          </div>
        </article>
      </div>
    </section>

    <!-- Top Expensive -->
    <section class="section">
      <h2 class="section-title">Top 5 Most Expensive</h2>
      <div class="top-list">
        <article
          v-for="(sub, idx) in topExpensive"
          :key="sub.id"
          class="top-item"
        >
          <div class="top-main">
            <div class="rank">{{ idx + 1 }}</div>
            <div
              class="top-avatar"
              :style="{
                background: `linear-gradient(135deg, ${sub.accent[0]}, ${sub.accent[1]})`,
              }"
            >
              <svg viewBox="0 0 24 24">
                <path :d="iconPaths[sub.icon]" />
              </svg>
            </div>
            <div class="top-info">
              <div class="top-name">{{ sub.name }}</div>
              <div class="top-category">{{ sub.category }}</div>
            </div>
          </div>
          <div class="top-amount">
            {{ formatCurrency(sub.monthlyAmount) }}
            <span class="period">/mo</span>
          </div>
        </article>
      </div>
    </section>

    <!-- Total Paid Per Subscription -->
    <section class="section">
      <h2 class="section-title">Total Paid per Subscription</h2>
      <div class="paid-list">
        <article
          v-for="sub in totalPaidPerSubscription"
          :key="sub.id"
          class="paid-item"
        >
          <div class="paid-main">
            <div
              class="paid-avatar"
              :style="{
                background: `linear-gradient(135deg, ${sub.accent[0]}, ${sub.accent[1]})`,
              }"
            >
              <svg viewBox="0 0 24 24">
                <path :d="iconPaths[sub.icon]" />
              </svg>
            </div>
            <div class="paid-info">
              <div class="paid-name">{{ sub.name }}</div>
              <div class="paid-details">
                <span class="paid-cycle">{{ sub.cycle }}</span>
                <span class="paid-separator">•</span>
                <span class="paid-count">{{ sub.cycleCount }} payments</span>
                <span class="paid-separator">•</span>
                <span class="paid-days">{{ sub.daysSinceStart }} days</span>
              </div>
            </div>
          </div>
          <div class="paid-amount">
            <div class="paid-total">{{ formatCurrency(sub.totalPaid) }}</div>
            <div class="paid-label">Total Paid</div>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* Stat Icon Override */
.stat-icon {
  background: var(--card-color);
  color: white;
}

[data-theme="light"] .stat-card:hover {
  border-color: var(--card-color);
}

.category-list,
.top-list,
.paid-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.category-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  padding: 20px;
  transition: all 0.2s;
}

.category-card:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.category-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.category-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.category-name {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  text-transform: capitalize;
}

.category-count {
  font-size: 13px;
  color: var(--muted);
  margin-top: 2px;
}

.category-amount {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
}

.category-subs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.sub-tag {
  display: inline-block;
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 100px;
  font-size: 12px;
  color: var(--muted);
}

.top-item,
.paid-item {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  transition: all 0.2s;
}

.top-main,
.paid-main {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
}

.rank {
  font-size: 18px;
  font-weight: 800;
  color: #6366f1;
  width: 24px;
  flex-shrink: 0;
  opacity: 0.8;
}

.top-avatar,
.paid-avatar {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.top-avatar svg,
.paid-avatar svg {
  width: 22px;
  height: 22px;
  stroke: white;
  stroke-width: 2;
  fill: none;
}

.top-info,
.paid-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.top-name,
.paid-name {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
}

.top-category {
  font-size: 13px;
  color: var(--muted);
  text-transform: capitalize;
}

.paid-details {
  font-size: 12px;
  color: var(--muted);
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.top-amount,
.paid-amount {
  text-align: right;
  flex-shrink: 0;
}

.top-amount {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
}

.paid-total {
  font-size: 18px;
  font-weight: 700;
  color: #10b981;
}

.paid-label {
  font-size: 11px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

[data-theme="light"] .category-card,
[data-theme="light"] .top-item,
[data-theme="light"] .paid-item {
  background: #ffffff;
  border-color: #e5e7eb;
}

[data-theme="light"] .category-name,
[data-theme="light"] .category-amount,
[data-theme="light"] .top-name,
[data-theme="light"] .paid-name,
[data-theme="light"] .top-amount {
  color: #1e293b;
}

[data-theme="light"] .sub-tag {
  background: #f1f5f9;
  color: #475569;
}

[data-theme="light"] .rank {
  color: #4f46e5;
}

/* Responsive */
@media (max-width: 600px) {
  .top-item,
  .paid-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .top-amount,
  .paid-amount {
    width: 100%;
    text-align: left;
    padding-left: 84px; /* Rank + Avatar + Gaps */
  }
}
</style>
