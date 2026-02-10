<script setup>
import { ref, computed } from "vue";
import { iconPaths } from "../icons";

const props = defineProps({
  subscriptions: {
    type: Array,
    required: true,
  },
  categories: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits([
  "add",
  "edit",
  "delete",
  "import-json",
  "export-json",
]);

const searchQuery = ref("");
const statusFilter = ref("All Status");
const categoryFilter = ref("All Categories");
const sortKey = ref("name"); // name, price, expiry
const sortOrder = ref("asc");

const statusOptions = ["All Status", "Active", "Expired"];

const filteredSubs = computed(() => {
  let subs = [...props.subscriptions];

  // Search
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    subs = subs.filter((s) => s.name.toLowerCase().includes(q));
  }

  // Filter Status
  if (statusFilter.value !== "All Status") {
    if (statusFilter.value === "Active")
      subs = subs.filter((s) => s.status === "ACTIVE");
    if (statusFilter.value === "Expired")
      subs = subs.filter((s) => s.status === "EXPIRED");
  }

  // Filter Category
  if (categoryFilter.value !== "All Categories") {
    subs = subs.filter((s) => s.category === categoryFilter.value);
  }

  // Sort
  subs.sort((a, b) => {
    let valA, valB;
    if (sortKey.value === "name") {
      valA = a.name.toLowerCase();
      valB = b.name.toLowerCase();
    } else if (sortKey.value === "price") {
      valA = a.price;
      valB = b.price;
    } else if (sortKey.value === "expiry") {
      valA = getNextBillingDate(a).getTime();
      valB = getNextBillingDate(b).getTime();
    }

    if (valA < valB) return sortOrder.value === "asc" ? -1 : 1;
    if (valA > valB) return sortOrder.value === "asc" ? 1 : -1;
    return 0;
  });

  return subs;
});

function toggleSort(key) {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === "asc" ? "desc" : "asc";
  } else {
    sortKey.value = key;
    sortOrder.value = "asc";
  }
}

function handleImportClick() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (readEvt) => {
        try {
          const json = JSON.parse(readEvt.target.result);
          emit("import-json", json);
        } catch (err) {
          alert("Invalid JSON file");
        }
      };
      reader.readAsText(file);
    }
  };
  input.click();
}

function exportData() {
  emit("export-json");
}

function formatPriceDisplay(sub) {
  return (
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: sub.currency,
    }).format(sub.price) + "/mo"
  );
}

function getNextBillingDate(sub) {
  if (sub.status !== "ACTIVE" || !sub.autoRenew) return new Date(sub.expiry);
  const today = new Date();
  const start = new Date(sub.startDate);
  let next = new Date(start);

  if (next > today) return next;

  while (next <= today) {
    if (sub.cycle === "Gói tháng") {
      next.setMonth(next.getMonth() + 1);
    } else if (sub.cycle === "Gói Quý") {
      next.setMonth(next.getMonth() + 3);
    } else if (sub.cycle === "Gói 6 tháng") {
      next.setMonth(next.getMonth() + 6);
    } else {
      next.setFullYear(next.getFullYear() + 1);
    }
    if (next.getFullYear() > today.getFullYear() + 10) break;
  }
  return next;
}

function getDaysLeft(sub) {
  const today = new Date();
  const nextBilling = getNextBillingDate(sub);
  const diff = nextBilling - today;
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return days;
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("vi-VN", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
</script>

<template>
  <div class="subscriptions-page fade-in">
    <header class="page-header">
      <div class="header-content">
        <!-- <p class="eyebrow">MANAGEMENT</p> -->
        <h1>Subscriptions</h1>
        <!-- <p class="subtitle">Manage all your subscriptions in one place</p> -->
      </div>
      <div class="header-actions">
        <button class="pill-btn secondary" @click="handleImportClick">
          <svg viewBox="0 0 24 24"><path :d="iconPaths.upload" /></svg>
          Import
        </button>
        <button class="pill-btn secondary" @click="exportData">
          <svg viewBox="0 0 24 24"><path :d="iconPaths.download" /></svg>
          Export
        </button>
        <button class="pill-btn primary" @click="$emit('add')">
          <svg viewBox="0 0 24 24"><path :d="iconPaths.plus" /></svg>
          Add Subscription
        </button>
      </div>
    </header>

    <div class="toolbar">
      <div class="search-box">
        <svg viewBox="0 0 24 24"><path :d="iconPaths.search" /></svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search subscriptions..."
        />
        <button
          v-if="searchQuery"
          class="clear-btn"
          @click="searchQuery = ''"
          type="button"
          aria-label="Clear search"
        >
          <svg viewBox="0 0 24 24"><path :d="iconPaths.close" /></svg>
        </button>
      </div>

      <div class="filter-separator">
        <svg viewBox="0 0 24 24"><path :d="iconPaths.filter" /></svg>
      </div>

      <div class="filters-row">
        <div class="dropdown">
          <select v-model="statusFilter">
            <option v-for="opt in statusOptions" :key="opt" :value="opt">
              {{ opt }}
            </option>
          </select>
          <div class="select-arrow">
            <svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg>
          </div>
        </div>

        <div class="dropdown">
          <select v-model="categoryFilter">
            <option value="All Categories">All Categories</option>
            <option v-for="cat in categories" :key="cat.id" :value="cat.id">
              {{ cat.label }}
            </option>
          </select>
          <div class="select-arrow">
            <svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg>
          </div>
        </div>

        <div class="sort-group">
          <button
            class="sort-btn"
            :class="{ active: sortKey === 'name' }"
            @click="toggleSort('name')"
          >
            Name
            <span v-if="sortKey === 'name'">{{
              sortOrder === "asc" ? "↑" : "↓"
            }}</span>
          </button>
          <button
            class="sort-btn"
            :class="{ active: sortKey === 'price' }"
            @click="toggleSort('price')"
          >
            Price
          </button>
          <button
            class="sort-btn"
            :class="{ active: sortKey === 'expiry' }"
            @click="toggleSort('expiry')"
          >
            Expiration
          </button>
        </div>
      </div>
    </div>

    <div class="subs-count">
      Showing {{ filteredSubs.length }} of
      {{ subscriptions.length }} subscriptions
    </div>

    <div class="subs-grid">
      <article v-for="sub in filteredSubs" :key="sub.id" class="sub-card-large">
        <div class="card-top">
          <div class="card-brand">
            <div
              class="brand-icon"
              :style="{
                background: `linear-gradient(135deg, ${sub.accent[0]}, ${sub.accent[1]})`,
              }"
            >
              <svg viewBox="0 0 24 24"><path :d="iconPaths[sub.icon]" /></svg>
            </div>
            <div class="brand-info">
              <h3>{{ sub.name }}</h3>
              <div class="brand-cat">
                <svg
                  viewBox="0 0 24 24"
                  style="
                    width: 12px;
                    height: 12px;
                    margin-right: 4px;
                    fill: none;
                    stroke: currentColor;
                  "
                >
                  <path :d="iconPaths.cloud" />
                </svg>
                {{ sub.category }}
              </div>
            </div>
          </div>
          <div class="card-actions">
            <button class="icon-btn-sm" @click="$emit('edit', sub)">
              <svg viewBox="0 0 24 24"><path :d="iconPaths.edit" /></svg>
            </button>
            <button class="icon-btn-sm danger" @click="$emit('delete', sub.id)">
              <svg viewBox="0 0 24 24"><path :d="iconPaths.trash" /></svg>
            </button>
          </div>
        </div>

        <div class="card-mid">
          <div class="big-price">{{ formatPriceDisplay(sub) }}</div>
          <div class="days-badge" :class="{ warning: getDaysLeft(sub) <= 7 }">
            {{ getDaysLeft(sub) }}D LEFT
          </div>
        </div>

        <div class="card-dates">
          <div class="date-col">
            <span class="label">START</span>
            <span class="val">{{ formatDate(sub.startDate) }}</span>
          </div>
          <div class="arrow">→</div>
          <div class="date-col">
            <span class="label">{{
              sub.autoRenew ? "NEXT BILL" : "EXPIRES"
            }}</span>
            <span class="val">{{ formatDate(getNextBillingDate(sub)) }}</span>
          </div>
        </div>

        <div class="card-footer">
          <div class="auto-renew" :class="{ active: sub.autoRenew }">
            <svg viewBox="0 0 24 24" v-if="sub.autoRenew">
              <path :d="iconPaths.clock" />
            </svg>
            <span>{{
              sub.autoRenew ? "Auto-renewal enabled" : "Manual renewal"
            }}</span>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
/* Specific styles for Subscriptions page */

.subscriptions-page {
  animation: fadeIn 0.3s ease;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  gap: 20px;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.subtitle {
  color: var(--muted);
  margin: 0;
  font-size: 14px;
}

/* Toolbar */
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
  margin-bottom: 24px;
}

.search-box {
  flex: 1;
  min-width: 300px;
  height: 48px;
  display: flex;
  align-items: center;
  gap: 12px;
  background: #0f182c;
  padding: 0 16px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition: border-color 0.2s;
}

.search-box:focus-within {
  border-color: #6366f1;
}

.search-box svg {
  width: 20px;
  height: 20px;
  stroke: #64748b;
  fill: none;
  stroke-width: 2;
}

.search-box input {
  background: transparent;
  border: none;
  color: white;
  width: 100%;
  height: 100%;
  outline: none;
  font-size: 14px;
}

.clear-btn {
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 4px;
  margin-left: 4px;
  border-radius: 50%;
  transition: all 0.2s;
  flex-shrink: 0;
}

.clear-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.clear-btn svg {
  width: 16px;
  height: 16px;
  stroke: currentColor;
  stroke-width: 2.5;
  fill: none;
}

.filter-separator {
  color: #64748b;
  display: grid;
  place-items: center;
  padding: 0 4px;
}

.filter-separator svg {
  width: 20px;
  height: 20px;
  fill: currentColor;
}

.filters-row {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.dropdown {
  position: relative;
  min-width: 140px;
}

.dropdown select {
  width: 100%;
  height: 48px;
  background: #0f182c;
  color: #dfe7ff;
  border: 1px solid rgba(255, 255, 255, 0.06);
  padding: 0 36px 0 16px;
  border-radius: 12px;
  cursor: pointer;
  font-size: 14px;
  appearance: none;
  transition: border-color 0.2s;
}

.dropdown select:focus {
  border-color: #6366f1;
  outline: none;
}

.select-arrow {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: #64748b;
  pointer-events: none;
  display: grid;
  place-items: center;
}

.select-arrow svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
}

.sort-group {
  display: flex;
  background: #0f182c;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  padding: 4px;
  height: 48px;
  align-items: center;
}

.sort-btn {
  background: transparent;
  border: none;
  color: var(--muted);
  padding: 0 16px;
  height: 38px;
  font-size: 13px;
  cursor: pointer;
  border-radius: 8px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
}

.sort-btn:hover {
  color: #fff;
}

.sort-btn.active {
  background: rgba(99, 102, 241, 0.15);
  color: #818cf8;
  border: 1px solid rgba(99, 102, 241, 0.3);
}

.subs-count {
  margin: 24px 0 16px;
  color: var(--muted);
  font-size: 13px;
}

.subs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 24px;
}

/* Large Card */
.sub-card-large {
  background: #0f182c;
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 20px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  transition:
    transform 0.2s,
    box-shadow 0.2s;
  position: relative;
  overflow: hidden;
}

.sub-card-large:hover {
  transform: translateY(-4px);
  box-shadow: 0 14px 40px rgba(0, 0, 0, 0.3);
  border-color: rgba(123, 91, 255, 0.4);
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.card-brand {
  display: flex;
  gap: 16px;
}

.brand-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.brand-icon svg {
  width: 28px;
  height: 28px;
  fill: none;
  stroke: white;
  stroke-width: 2;
}

.brand-info h3 {
  margin: 0 0 6px 0;
  font-size: 18px;
  font-weight: 700;
  color: #fff;
}

.brand-cat {
  display: flex;
  align-items: center;
  font-size: 13px;
  color: var(--muted);
}

.card-actions {
  display: flex;
  gap: 8px;
  opacity: 0;
  transition: 0.2s;
}

.sub-card-large:hover .card-actions {
  opacity: 1;
}

.icon-btn-sm {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  display: grid;
  place-items: center;
  color: var(--muted);
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.icon-btn-sm:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.icon-btn-sm.danger:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.icon-btn-sm svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
}

.card-mid {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding-bottom: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.big-price {
  font-size: 28px;
  font-weight: 800;
  color: #fff;
  letter-spacing: -0.5px;
}

.days-badge {
  font-size: 11px;
  background: rgba(255, 255, 255, 0.05);
  padding: 4px 10px;
  border-radius: 100px;
  font-weight: 700;
  color: var(--muted);
}

.days-badge.warning {
  background: rgba(255, 111, 60, 0.15);
  color: #ff6f3c;
}

.card-dates {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.date-col {
  display: flex;
  flex-direction: column;
}

.date-col .label {
  font-size: 10px;
  color: var(--muted);
  font-weight: 700;
  margin-bottom: 4px;
}

.date-col .val {
  font-size: 13px;
  color: #dfe7ff;
  font-weight: 500;
}

.arrow {
  color: var(--muted);
  opacity: 0.3;
}

.card-footer {
  margin-top: auto;
  padding-top: 16px;
}

.auto-renew {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--muted);
}

.auto-renew.active {
  color: #3ade8b;
}

.auto-renew svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
}

/* Light Theme Overrides */
[data-theme="light"] .search-box {
  background: white;
  border-color: rgba(0, 0, 0, 0.1);
}

[data-theme="light"] .search-box input {
  color: #111827;
}

[data-theme="light"] .dropdown select {
  background: white;
  color: #111827;
  border-color: rgba(0, 0, 0, 0.1);
}

[data-theme="light"] .sort-group {
  background: rgba(0, 0, 0, 0.03);
  border-color: transparent;
}

[data-theme="light"] .sort-btn {
  color: #6b7280;
}

[data-theme="light"] .sort-btn:hover {
  color: #111827;
}

[data-theme="light"] .sub-card-large {
  background: white;
  border-color: rgba(0, 0, 0, 0.05);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
}

[data-theme="light"] .brand-info h3 {
  color: #111827;
}

[data-theme="light"] .big-price {
  color: #111827;
}

[data-theme="light"] .date-col .val {
  color: #374151;
}

[data-theme="light"] .icon-btn-sm {
  background: #f3f4f6;
  color: #6b7280;
}

[data-theme="light"] .icon-btn-sm:hover {
  background: #e5e7eb;
  color: #111827;
}

[data-theme="light"] .days-badge {
  background: #f3f4f6;
  color: #6b7280;
}

[data-theme="light"] .days-badge.warning {
  background: #fff0eb;
  color: #e65100;
}
</style>
