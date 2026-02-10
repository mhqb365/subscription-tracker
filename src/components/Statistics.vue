<script setup>
import { computed } from "vue";
import { iconPaths } from "../icons";

const props = defineProps({
  subscriptions: {
    type: Array,
    required: true,
  },
});

// Calculate total spending by period (Logic mới - chính xác theo từng bill)
const calculateTotalByPeriod = (period) => {
  const now = new Date();
  let rangeStart, rangeEnd;

  switch (period) {
    case "month":
      rangeStart = new Date(now.getFullYear(), now.getMonth(), 1);
      rangeEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      break;
    case "quarter":
      const quarter = Math.floor(now.getMonth() / 3);
      rangeStart = new Date(now.getFullYear(), quarter * 3, 1);
      rangeEnd = new Date(now.getFullYear(), quarter * 3 + 3, 0, 23, 59, 59);
      break;
    case "year":
      rangeStart = new Date(now.getFullYear(), 0, 1);
      rangeEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
      break;
    case "all":
      rangeStart = new Date(0);
      rangeEnd = now;
      break;
  }

  let total = 0;

  props.subscriptions.forEach((sub) => {
    if (sub.status !== "ACTIVE") return;

    let amount = sub.price;
    if (sub.currency === "USD") {
      amount = sub.price * 25400;
    }

    let currentBillDate = new Date(sub.startDate);
    currentBillDate.setHours(0, 0, 0, 0);
    const pStart = new Date(rangeStart);
    pStart.setHours(0, 0, 0, 0);
    const pEnd = new Date(rangeEnd);
    pEnd.setHours(23, 59, 59, 999);

    while (currentBillDate <= pEnd) {
      if (currentBillDate >= pStart) {
        total += amount;
      }
      if (sub.cycle === "Gói tháng")
        currentBillDate.setMonth(currentBillDate.getMonth() + 1);
      else if (sub.cycle === "Gói Quý")
        currentBillDate.setMonth(currentBillDate.getMonth() + 3);
      else if (sub.cycle === "Gói 6 tháng")
        currentBillDate.setMonth(currentBillDate.getMonth() + 6);
      else if (sub.cycle === "Gói Năm")
        currentBillDate.setFullYear(currentBillDate.getFullYear() + 1);
      else currentBillDate.setMonth(currentBillDate.getMonth() + 1);
    }
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
    label: "Total",
    value: calculateTotalByPeriod("all"),
    icon: "dollar",
    color: "#10b981",
  },
]);

// Spending by category
const spendingByCategory = computed(() => {
  const categoryMap = {};

  props.subscriptions.forEach((sub) => {
    if (sub.status !== "ACTIVE") return;

    if (!categoryMap[sub.category]) {
      categoryMap[sub.category] = {
        category: sub.category,
        total: 0,
        count: 0,
        subscriptions: [],
      };
    }

    let monthlyAmount = sub.price;
    if (sub.currency === "USD") {
      monthlyAmount = sub.price * 25400;
    }

    if (sub.cycle === "Gói Quý") monthlyAmount = monthlyAmount / 3;
    if (sub.cycle === "Gói 6 tháng") monthlyAmount = monthlyAmount / 6;
    if (sub.cycle === "Gói Năm") monthlyAmount = monthlyAmount / 12;

    categoryMap[sub.category].total += monthlyAmount;
    categoryMap[sub.category].count++;
    categoryMap[sub.category].subscriptions.push(sub.name);
  });

  return Object.values(categoryMap).sort((a, b) => b.total - a.total);
});

// Top expensive subscriptions
const topExpensive = computed(() => {
  return [...props.subscriptions]
    .filter((s) => s.status === "ACTIVE")
    .map((sub) => {
      let monthlyAmount = sub.price;
      if (sub.currency === "USD") {
        monthlyAmount = sub.price * 25400;
      }
      if (sub.cycle === "Gói Quý") monthlyAmount = monthlyAmount / 3;
      if (sub.cycle === "Gói 6 tháng") monthlyAmount = monthlyAmount / 6;
      if (sub.cycle === "Gói Năm") monthlyAmount = monthlyAmount / 12;

      return { ...sub, monthlyAmount };
    })
    .sort((a, b) => b.monthlyAmount - a.monthlyAmount)
    .slice(0, 5);
});

// Calculate total paid for each subscription since start
const totalPaidPerSubscription = computed(() => {
  const now = new Date();

  return [...props.subscriptions]
    .map((sub) => {
      const subStart = new Date(sub.startDate);
      if (subStart > now) {
        return { ...sub, totalPaid: 0, cycleCount: 0 };
      }

      let amount = sub.price;
      if (sub.currency === "USD") {
        amount = sub.price * 25400;
      }

      const cycleMonths = {
        "Gói tháng": 1,
        "Gói Quý": 3,
        "Gói 6 tháng": 6,
        "Gói Năm": 12,
      };

      const monthsPerCycle = cycleMonths[sub.cycle] || 1;
      const daysSinceStart = Math.floor(
        (now - subStart) / (1000 * 60 * 60 * 24),
      );
      const cycleCount = Math.floor(daysSinceStart / (monthsPerCycle * 30));
      const totalPaid = amount * cycleCount;

      return {
        ...sub,
        totalPaid,
        cycleCount,
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
  };
  return colors[category] || "#6b7280";
}
</script>

<template>
  <div class="statistics-page fade-in">
    <header class="page-header">
      <div>
        <!-- <p class="eyebrow">ANALYTICS</p> -->
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
/* Specific styles for Statistics page only */

/* Stat Icon Override - keeps dynamic color */
.stat-icon {
  background: var(--card-color);
  color: white;
}

[data-theme="light"] .stat-card:hover {
  border-color: var(--card-color);
}

/* Category List */
.category-list {
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

/* Top List */
.top-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.top-item {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: all 0.2s;
}

.top-item:hover {
  background: rgba(255, 255, 255, 0.05);
  transform: translateX(4px);
}

.rank {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 14px;
  color: #fff;
  flex-shrink: 0;
}

.top-avatar {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.top-avatar svg {
  width: 24px;
  height: 24px;
  stroke: white;
  stroke-width: 2;
  fill: none;
}

.top-info {
  flex: 1;
}

.top-name {
  font-size: 15px;
  font-weight: 600;
  color: #fff;
}

.top-category {
  font-size: 13px;
  color: var(--muted);
  text-transform: capitalize;
  margin-top: 2px;
}

.top-amount {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  text-align: right;
}

.period {
  font-size: 12px;
  font-weight: 400;
  color: var(--muted);
}

/* Paid List */
.paid-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.paid-item {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: all 0.2s;
}

.paid-item:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
  transform: translateX(4px);
}

.paid-avatar {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.paid-avatar svg {
  width: 28px;
  height: 28px;
  stroke: white;
  stroke-width: 2;
  fill: none;
}

.paid-info {
  flex: 1;
}

.paid-name {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 6px;
}

.paid-details {
  font-size: 13px;
  color: var(--muted);
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.paid-separator {
  opacity: 0.5;
}

.paid-amount {
  text-align: right;
  flex-shrink: 0;
}

.paid-total {
  font-size: 20px;
  font-weight: 700;
  color: #10b981;
  margin-bottom: 4px;
}

.paid-label {
  font-size: 12px;
  color: var(--muted);
}

/* Light Theme Overrides */
[data-theme="light"] .category-card,
[data-theme="light"] .top-item,
[data-theme="light"] .paid-item {
  background: #ffffff;
  border-color: #e5e7eb;
}

[data-theme="light"] .category-card:hover,
[data-theme="light"] .top-item:hover,
[data-theme="light"] .paid-item:hover {
  border-color: #cbd5e1;
}

[data-theme="light"] .sub-tag {
  background: #f3f4f6;
  color: #6b7280;
}

[data-theme="light"] .category-name,
[data-theme="light"] .category-amount,
[data-theme="light"] .top-name,
[data-theme="light"] .top-amount,
[data-theme="light"] .paid-name {
  color: #1e293b;
}

[data-theme="light"] .paid-total {
  color: #059669;
}

/* Responsive */
@media (max-width: 720px) {
  .category-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .top-item,
  .paid-item {
    flex-wrap: wrap;
  }

  .top-amount,
  .paid-amount {
    width: 100%;
    text-align: left;
    margin-top: 8px;
  }

  .paid-total {
    font-size: 18px;
  }
}
</style>
