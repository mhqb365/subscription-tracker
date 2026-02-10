<script setup>
import { ref, computed, watch, onMounted } from "vue";
import SubscriptionDetail from "./components/SubscriptionDetail.vue";
import Dashboard from "./components/Dashboard.vue";
import Subscriptions from "./components/Subscriptions.vue";
import Statistics from "./components/Statistics.vue";
import Settings from "./components/Settings.vue";
import { initGoogleServices, autoSync } from "./services/googleDrive";
import { iconPaths } from "./icons";

const navItems = [
  { label: "Dashboard", icon: "grid", id: "dashboard" },
  { label: "Subscriptions", icon: "card", id: "subscriptions" },
  { label: "Statistics", icon: "chart", id: "statistics" },
  { label: "Settings", icon: "settings", id: "settings" },
];

const popularServices = [
  // Entertainment
  {
    name: "Netflix",
    icon: "netflix",
    color: "#E50914",
    category: "entertainment",
  },
  {
    name: "YouTube",
    icon: "youtube",
    color: "#FF0000",
    category: "entertainment",
  },

  // Productivity & Communication
  { name: "ChatGPT", icon: "dev", color: "#74aa9c", category: "productivity" },
  { name: "Claude", icon: "dev", color: "#CC9B7A", category: "productivity" },
  // Design
  { name: "Canva", icon: "design", color: "#00C4CC", category: "design" },
  { name: "Sketch", icon: "design", color: "#FDB300", category: "design" },

  // Development & Cloud
  { name: "GitHub", icon: "dev", color: "#181717", category: "dev" },
  { name: "DigitalOcean", icon: "server", color: "#0080FF", category: "cloud" },

  // Security & Utilities
  {
    name: "1Password",
    icon: "security",
    color: "#0094F5",
    category: "security",
  },
  { name: "iCloud", icon: "cloud", color: "#3693F3", category: "cloud" },
];

const categories = [
  { id: "dev", label: "Development", icon: "dev" },
  { id: "design", label: "Design", icon: "design" },
  { id: "entertainment", label: "Entertainment", icon: "entertainment" },
  { id: "credit", label: "Credit", icon: "card" },
  { id: "cloud", label: "Cloud", icon: "cloud" },
  { id: "security", label: "Security", icon: "security" },
  { id: "utilities", label: "Electricity", icon: "bolt" },
  { id: "internet", label: "Internet", icon: "wifi" },
  { id: "other", label: "Other", icon: "other" },
];

// State
const currentView = ref("dashboard");
const lastView = ref("dashboard");
const selectedSub = ref(null);
const isDark = ref(true);

function toggleTheme() {
  isDark.value = !isDark.value;
  updateTheme();
}

function updateTheme() {
  if (isDark.value) {
    document.documentElement.setAttribute("data-theme", "dark");
    localStorage.setItem("theme", "dark");
  } else {
    document.documentElement.setAttribute("data-theme", "light");
    localStorage.setItem("theme", "light");
  }
}

// Init theme
const storedTheme = localStorage.getItem("theme");
if (storedTheme) {
  isDark.value = storedTheme === "dark";
} else {
  isDark.value = window.matchMedia("(prefers-color-scheme: dark)").matches;
}
updateTheme();

// LocalStorage key
const STORAGE_KEY = "subscription_tracker_data";

// Load initial data from localStorage or use defaults
const loadSubscriptions = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Error loading from localStorage:", e);
  }
  // Default data if nothing in localStorage
  return [
    {
      id: 1,
      name: "Icloud",
      price: 260000,
      currency: "VND",
      startDate: "2024-02-24",
      expiry: "2026-02-24",
      members: 2,
      status: "ACTIVE",
      icon: "cloud",
      category: "cloud",
      accent: ["#4ac4ff", "#2d72ff"],
      cycle: "Monthly",
      note: "",
      autoRenew: true,
      familyPlan: false,
    },
    {
      id: 2,
      name: "Digitalocean",
      price: 7,
      currency: "USD",
      startDate: "2024-02-01",
      expiry: "2027-02-01",
      members: 0,
      status: "ACTIVE",
      icon: "server",
      category: "dev",
      accent: ["#50e3c2", "#2288ff"],
      cycle: "Monthly",
      note: "",
      autoRenew: true,
      familyPlan: false,
    },
  ];
};

const subscriptions = ref(loadSubscriptions());

onMounted(async () => {
  await initGoogleServices();

  if (isDark.value) {
    // Ensure theme is consistent
    document.documentElement.setAttribute("data-theme", "dark");
  }

  // Attempt auto sync
  await autoSync((newData) => {
    subscriptions.value = newData;
    // alert("🔄 New data found on Drive and synced!");
  });
});

// Watch subscriptions and save to localStorage whenever they change
watch(
  subscriptions,
  (newValue) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newValue));
    } catch (e) {
      console.error("Error saving to localStorage:", e);
    }
  },
  { deep: true },
);

// Computeds
const totalSpending = computed(() => {
  let total = 0;
  subscriptions.value.forEach((sub) => {
    if (sub.status !== "ACTIVE") return;
    let amount = sub.price;
    if (sub.currency === "USD") {
      amount = sub.price * 25400; // Approximate rate
    }
    // Very simple cycle calculation, assumes monthly for dashboard
    if (sub.cycle === "Quarterly") amount = amount / 3;
    if (sub.cycle === "Semi-Annually") amount = amount / 6;
    if (sub.cycle === "Annually") amount = amount / 12;
    total += amount;
  });
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(total);
});

const stats = computed(() => [
  {
    title: "Total Subscriptions",
    value: subscriptions.value.length.toString(),
    icon: "layers",
    gradient: "linear-gradient(135deg, #7b5bff, #9b5cf7)",
  },
  {
    title: "Monthly Spending",
    value: totalSpending.value,
    icon: "dollar",
    gradient: "linear-gradient(135deg, #00cba9, #0096c7)",
  },
  {
    title: "Expiring Soon",
    value: subscriptions.value.filter(isExpiringSoon).length.toString(),
    icon: "clock",
    gradient: "linear-gradient(135deg, #ff9f43, #ff6f3c)",
  },
  {
    title: "Total Members",
    value: subscriptions.value
      .reduce((acc, sub) => acc + (sub.familyPlan ? sub.members || 0 : 0), 0)
      .toString(),
    icon: "users",
    gradient: "linear-gradient(135deg, #f452ff, #b36bff)",
  },
]);

function getNextBillingDate(sub) {
  if (sub.status !== "ACTIVE" || !sub.autoRenew) return new Date(sub.expiry);

  const today = new Date();
  const start = new Date(sub.startDate);
  let next = new Date(start);

  // If start is in the future, that's our first "expiry"
  if (next > today) return next;

  // Advance next until it's strictly greater than today
  while (next <= today) {
    if (sub.cycle === "Monthly") {
      next.setMonth(next.getMonth() + 1);
    } else if (sub.cycle === "Quarterly") {
      next.setMonth(next.getMonth() + 3);
    } else if (sub.cycle === "Semi-Annually") {
      next.setMonth(next.getMonth() + 6);
    } else {
      next.setFullYear(next.getFullYear() + 1);
    }
    // Safety break
    if (next.getFullYear() > today.getFullYear() + 10) break;
  }
  return next;
}

function isExpiringSoon(sub) {
  if (sub.status !== "ACTIVE") return false;
  const today = new Date();
  const nextBilling = getNextBillingDate(sub);
  const diffTime = nextBilling - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= 7;
}

// Actions
function openDetail(sub = null) {
  lastView.value = currentView.value;
  selectedSub.value = sub;
  currentView.value = "detail";
}

function handleSave(subData) {
  if (subData.id) {
    const index = subscriptions.value.findIndex((s) => s.id === subData.id);
    if (index !== -1) {
      subscriptions.value[index] = subData;
    }
  } else {
    const newSub = {
      ...subData,
      id: Date.now(),
      accent: subData.accent || getRandomGradient(),
    };
    subscriptions.value.push(newSub);
  }
  // Go back to the 'Subscriptions' view if that's where we came from, or stay there
  currentView.value = lastView.value;
}

function handleDelete(id) {
  if (confirm(`Delete subscription?`)) {
    subscriptions.value = subscriptions.value.filter((s) => s.id !== id);
    if (currentView.value === "detail") {
      currentView.value = lastView.value;
    }
  }
}

function handleImport(data) {
  if (confirm(`Replace all existing subscriptions with imported data?`)) {
    subscriptions.value = data;
  }
}

function handleNav(item) {
  currentView.value = item.id;
}

function getRandomGradient() {
  const colors = [
    ["#4ac4ff", "#2d72ff"],
    ["#50e3c2", "#2288ff"],
    ["#ff9f43", "#ff6f3c"],
    ["#f452ff", "#b36bff"],
    ["#1dd0ff", "#8c67ff"],
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-knot"></div>
        <span>ST</span>
      </div>
      <nav class="nav">
        <button
          v-for="item in navItems"
          :key="item.id"
          class="nav-link"
          :class="{
            active:
              currentView === item.id ||
              (currentView === 'detail' && lastView === item.id),
          }"
          type="button"
          @click="handleNav(item)"
        >
          <div class="nav-icon">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path :d="iconPaths[item.icon]" />
            </svg>
          </div>
          <span>{{ item.label }}</span>
        </button>
      </nav>
    </aside>

    <main class="main">
      <Dashboard
        v-if="currentView === 'dashboard'"
        :stats="stats"
        :subscriptions="subscriptions"
        @view-all="currentView = 'subscriptions'"
        @add="openDetail(null)"
        @edit="openDetail"
        @delete="handleDelete"
      />

      <Subscriptions
        v-else-if="currentView === 'subscriptions'"
        :subscriptions="subscriptions"
        :categories="categories"
        @add="openDetail(null)"
        @edit="openDetail"
        @delete="handleDelete"
        @import="handleImport"
      />

      <Settings
        v-else-if="currentView === 'settings'"
        :subscriptions="subscriptions"
        :is-dark="isDark"
        @import="handleImport"
        @toggle-theme="toggleTheme"
      />

      <Statistics
        v-else-if="currentView === 'statistics'"
        :subscriptions="subscriptions"
      />

      <SubscriptionDetail
        v-if="currentView === 'detail'"
        :subscription="selectedSub"
        :categories="categories"
        @save="handleSave"
        @cancel="currentView = lastView"
        @delete="handleDelete"
      />
    </main>
  </div>
</template>

<style scoped>
/* App Shell & Layout */
.app-shell {
  display: flex;
  min-height: 100vh;
  color: var(--text);
}

.sidebar {
  width: 92px;
  background: #0a0f1d;
  border-right: 1px solid rgba(255, 255, 255, 0.04);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 22px 14px;
  gap: 24px;
  flex-shrink: 0;
}

.brand {
  width: 54px;
  height: 54px;
  border-radius: 16px;
  background: linear-gradient(135deg, #1dd0ff, #8c67ff);
  display: grid;
  place-items: center;
  color: #fff;
  font-weight: 700;
  letter-spacing: -0.25px;
  position: relative;
  box-shadow: 0 14px 40px rgba(93, 80, 255, 0.35);
  margin-bottom: 24px;
}

.brand-knot {
  position: absolute;
  inset: 8px;
  border-radius: 12px;
  background:
    radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.35), transparent),
    radial-gradient(circle at 70% 70%, rgba(0, 0, 0, 0.25), transparent);
  opacity: 0.4;
  pointer-events: none;
}

.nav {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}

.nav-link {
  width: 100%;
  border: none;
  background: transparent;
  color: var(--muted);
  padding: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 200ms ease;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.3px;
}

.nav-icon {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  background: transparent;
  color: #8fa1c3;
  transition: all 200ms ease;
}

.nav-icon svg {
  width: 22px;
  height: 22px;
  stroke: currentColor;
  stroke-width: 2;
  fill: none;
}

.nav-link:hover .nav-icon {
  background: rgba(255, 255, 255, 0.05);
  color: #bfdbfe;
}

.nav-link:hover span {
  color: #bfdbfe;
}

.nav-link.active .nav-icon {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
  box-shadow: 0 10px 25px rgba(99, 102, 241, 0.4);
}

.nav-link.active span {
  color: #fff;
}

.main {
  flex: 1;
  padding: 28px 34px 80px;
  position: relative;
  background:
    radial-gradient(70% 50% at 70% 80%, rgba(92, 36, 255, 0.22), transparent),
    radial-gradient(40% 40% at 30% 20%, rgba(0, 191, 255, 0.16), transparent);
  overflow-y: auto;
  height: 100vh;
}
[data-theme="light"] .main {
  background:
    radial-gradient(70% 50% at 70% 80%, rgba(99, 102, 241, 0.15), transparent),
    radial-gradient(40% 40% at 30% 10%, rgba(244, 114, 182, 0.1), transparent);
}
[data-theme="light"] .sidebar {
  background: #ffffff;
  border-color: #e5e7eb;
}
[data-theme="light"] .nav-link {
  color: #6b7280;
}
[data-theme="light"] .nav-link:hover .nav-icon {
  background: #f3f4f6;
  color: #4f46e5;
}
[data-theme="light"] .nav-link:hover span {
  color: #4f46e5;
}
[data-theme="light"] .nav-link.active .nav-icon {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);
}
[data-theme="light"] .nav-link.active span {
  color: #4f46e5;
  font-weight: 700;
}

.placeholder-view {
  display: grid;
  place-items: center;
  height: 60vh;
  color: var(--muted);
}

@media (max-width: 720px) {
  .app-shell {
    flex-direction: column;
  }

  .sidebar {
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 70px;
    flex-direction: row;
    justify-content: space-between;
    padding: 0 12px;
    background: #0f182c;
    border-right: none;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    z-index: 100;
    box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.2);
    gap: 8px;
  }
  [data-theme="light"] .sidebar {
    background: #ffffff;
    border-top-color: #e5e7eb;
    box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.05);
  }

  .brand {
    display: none;
  }

  .nav {
    flex-direction: row;
    height: 100%;
    justify-content: space-around;
    width: 100%;
    gap: 0;
  }

  .nav-link {
    flex: 1;
    height: 100%;
    justify-content: center;
    gap: 4px;
    padding: 0;
    font-size: 10px;
  }

  .nav-icon {
    width: 32px;
    height: 32px;
    margin-bottom: 2px;
  }
  .nav-icon svg {
    width: 20px;
    height: 20px;
  }

  .main {
    padding: 20px 20px 90px; /* Add bottom padding to account for fixed nav */
    height: auto; /* Remove fixed height/overflow behavior if causing issues, or keep 100vh with adjustment */
    min-height: 100vh;
    overflow-y: visible; /* Let body scroll or keep main scrolling */
  }
}
</style>
