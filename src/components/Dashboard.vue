<script setup>
import { computed } from "vue";
import { iconPaths } from "../icons";

const props = defineProps({
  stats: {
    type: Array,
    required: true,
  },
  subscriptions: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(["view-all", "edit", "delete", "add"]);

// Show top 5 subscriptions expiring soonest
const expiringSubs = computed(() => {
  return [...props.subscriptions]
    .sort((a, b) => {
      // Prioritize active ones and those expiring soon
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      return getDaysLeft(a) - getDaysLeft(b);
    })
    .slice(0, 5);
});

function formatPriceDisplay(sub) {
  return (
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: sub.currency,
    }).format(sub.price) + "/mo"
  );
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return "";
  const options = { year: "numeric", month: "short", day: "numeric" };
  return new Date(dateStr).toLocaleDateString("vi-VN", options);
}

function getNextBillingDate(sub) {
  if (sub.status !== "ACTIVE" || !sub.autoRenew) return new Date(sub.expiry);
  const today = new Date();
  const start = new Date(sub.startDate);
  let next = new Date(start);
  if (next > today) return next;
  while (next <= today) {
    if (sub.cycle === "Monthly") next.setMonth(next.getMonth() + 1);
    else if (sub.cycle === "Quarterly") next.setMonth(next.getMonth() + 3);
    else if (sub.cycle === "Semi-Annually") next.setMonth(next.getMonth() + 6);
    else next.setFullYear(next.getFullYear() + 1);
    if (next.getFullYear() > today.getFullYear() + 10) break;
  }
  return next;
}

function getDaysLeft(sub) {
  const today = new Date();
  const nextBilling = getNextBillingDate(sub);
  const diff = nextBilling - today;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
</script>

<template>
  <div class="dashboard-page fade-in">
    <header class="page-header">
      <div>
        <!-- <p class="eyebrow">TỔNG QUAN</p> -->
        <h1>Dashboard</h1>
      </div>
      <button class="pill-btn primary" @click="$emit('add')">
        <svg viewBox="0 0 24 24"><path :d="iconPaths.plus" /></svg>
        Add Subscription
      </button>
    </header>

    <section class="stats-grid">
      <article
        v-for="item in stats"
        :key="item.title"
        class="stat-card"
        :style="{ background: item.gradient }"
      >
        <div class="stat-icon">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path :d="iconPaths[item.icon]" />
          </svg>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ item.value }}</div>
          <div class="stat-label">{{ item.title }}</div>
        </div>
      </article>
    </section>

    <section class="section">
      <div class="section-head">
        <h2 class="section-title" style="margin-bottom: 0">
          Recent Subscriptions
        </h2>
        <button class="btn-text" @click="$emit('view-all')">View All</button>
      </div>

      <div class="subscription-list">
        <article
          v-for="sub in expiringSubs"
          :key="sub.id"
          class="mini-card"
          :class="{
            'expiring-soon':
              getDaysLeft(sub) <= 7 && sub.status === 'ACTIVE' && sub.isActive,
            'is-inactive': !sub.isActive,
          }"
        >
          <div class="mini-left">
            <div
              class="avatar-sm"
              :style="{
                background: `linear-gradient(135deg, ${sub.accent[0]}, ${sub.accent[1]})`,
              }"
            >
              <svg viewBox="0 0 24 24"><path :d="iconPaths[sub.icon]" /></svg>
            </div>
            <div>
              <div class="title-row">
                <h4 class="mini-title">{{ sub.name }}</h4>
                <span
                  v-if="getDaysLeft(sub) <= 7 && sub.status === 'ACTIVE'"
                  class="expiry-label"
                >
                  Expiring Soon
                </span>
                <span v-if="!sub.isActive" class="stopped-label"> Ngưng </span>
              </div>
              <div class="mini-cat">{{ sub.category }}</div>
            </div>
          </div>
          <div class="mini-right">
            <span class="mini-price">{{ formatPriceDisplay(sub) }}</span>
            <div class="mini-actions">
              <button class="icon-btn-xs" @click="$emit('edit', sub)">
                <svg viewBox="0 0 24 24"><path :d="iconPaths.edit" /></svg>
              </button>
              <button
                class="icon-btn-xs danger"
                @click="$emit('delete', sub.id)"
              >
                <svg viewBox="0 0 24 24"><path :d="iconPaths.trash" /></svg>
              </button>
            </div>
            <span
              class="status-dot"
              :class="{ active: sub.status === 'ACTIVE' }"
            ></span>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* Specific styles for Dashboard */

.stat-card {
  /* Override default stat-card for dashboard gradients */
  position: relative;
  overflow: hidden;
  border: none;
}

.stat-card::after {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(
    circle at 85% 20%,
    rgba(255, 255, 255, 0.2),
    transparent 60%
  );
  pointer-events: none;
}

.stat-icon {
  background: rgba(255, 255, 255, 0.2);
  margin-left: auto;
}

.stat-value {
  margin-top: 12px;
  font-size: 26px;
  color: #ffffff; /* Default white */
}

.stat-label {
  opacity: 0.9;
  color: #ffffff; /* Default white */
}

/* Force white text in Light Mode - Because dashboard cards have colored BG */
[data-theme="light"] .stat-value,
[data-theme="light"] .stat-label {
  color: #ffffff !important;
}

/* Section Head overrides */
.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.btn-text {
  background: none;
  border: none;
  color: var(--primary);
  font-weight: 600;
  cursor: pointer;
  font-size: 14px;
}

/* Subscription List */
.subscription-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Mini Card */
.mini-card {
  background: #0f182c;
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 14px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.mini-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar-sm {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  color: white;
}

.avatar-sm svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
}

.mini-title {
  margin: 0;
  font-size: 14px;
  color: #fff;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.expiry-label {
  font-size: 10px;
  background: rgba(255, 111, 60, 0.2);
  color: #ff6f3c;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 700;
  text-transform: uppercase;
}

.stopped-label {
  font-size: 10px;
  background: rgba(255, 255, 255, 0.1);
  color: var(--muted);
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 700;
  text-transform: uppercase;
}

.mini-card.is-inactive {
  opacity: 0.7;
  background: rgba(15, 24, 44, 0.6);
}

.mini-card.expiring-soon {
  border-color: rgba(255, 111, 60, 0.3);
  background: linear-gradient(to right, rgba(255, 111, 60, 0.05), #0f182c);
}

.mini-cat {
  font-size: 12px;
  color: var(--muted);
  text-transform: capitalize;
}

.mini-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.mini-price {
  font-weight: 600;
  font-size: 13px;
  color: #dfe7ff;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #444;
}

.mini-actions {
  display: flex;
  gap: 6px;
  margin-right: 8px;
  opacity: 0;
  transition: 0.2s;
}

.mini-card:hover .mini-actions {
  opacity: 1;
}

/* Icon Buttons XS */
.icon-btn-xs {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.05);
  color: var(--muted);
  border: none;
  cursor: pointer;
}

.icon-btn-xs:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.icon-btn-xs.danger {
  color: #ff4757;
  background: rgba(255, 71, 87, 0.1);
}

.icon-btn-xs.danger:hover {
  background: rgba(255, 71, 87, 0.2);
  color: #ff4757;
}

/* Light theme danger btn override */
[data-theme="light"] .icon-btn-xs.danger {
  background: #fee2e2;
  color: #ef4444;
}
[data-theme="light"] .icon-btn-xs.danger:hover {
  background: #fecaca;
  color: #dc2626;
}

.icon-btn-xs svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
}

.status-dot.active {
  background: #3ade8b;
  box-shadow: 0 0 10px rgba(58, 222, 139, 0.4);
}

/* Light Theme Overrides */
[data-theme="light"] .mini-title {
  color: #111827;
}

[data-theme="light"] .mini-card {
  background: white;
  border-color: rgba(0, 0, 0, 0.05);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
}

[data-theme="light"] .mini-cat {
  color: #6b7280;
}

[data-theme="light"] .mini-price {
  color: #1f2937;
}

[data-theme="light"] .icon-btn-xs {
  background: #f3f4f6;
  color: #6b7280;
}

[data-theme="light"] .icon-btn-xs:hover {
  background: #e5e7eb;
  color: #111827;
}

[data-theme="light"] .mini-card.expiring-soon {
  background: linear-gradient(to right, #fff5f2, white);
  border-color: #ffbdad;
}

[data-theme="light"] .expiry-label {
  background: #fff0eb;
  color: #e65100;
}
</style>
