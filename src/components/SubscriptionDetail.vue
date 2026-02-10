<script setup>
import { reactive, onMounted, computed } from "vue";
import { iconPaths } from "../icons";

const props = defineProps({
  id: {
    type: [String, Number],
    default: null,
  },
  subscription: {
    type: Object,
    default: null,
  },
  subscriptions: {
    type: Array,
    default: () => [],
  },
  categories: {
    type: Array,
    required: true,
  },
});

const emit = defineEmits(["save", "cancel", "delete"]);

const formData = reactive({
  id: null,
  name: "",
  price: 0,
  currency: "VND",
  startDate: "",
  expiry: "",
  members: 0,
  status: "ACTIVE",
  icon: "layers",
  category: "other",
  cycle: "Monthly",
  note: "",
  autoRenew: true,
  familyPlan: false,
  accent: null,
});

const isEditing = computed(() => !!props.subscription || !!props.id);

onMounted(() => {
  let subToLoad = props.subscription;

  // If no direct subscription object, try to find by ID in the list
  if (!subToLoad && props.id && props.subscriptions.length > 0) {
    subToLoad = props.subscriptions.find(
      (s) => String(s.id) === String(props.id),
    );
  }

  if (subToLoad) {
    Object.assign(formData, JSON.parse(JSON.stringify(subToLoad)));
    if (formData.expiry?.includes("T"))
      formData.expiry = formData.expiry.split("T")[0];
    if (formData.startDate?.includes("T"))
      formData.startDate = formData.startDate.split("T")[0];
  } else {
    // defaults
    const today = new Date().toISOString().split("T")[0];
    formData.startDate = today;
    formData.expiry = today;
    applyDuration(1);
    formData.accent = getRandomGradient();

    // Default form details if adding new
    formData.name = "";
    formData.price = 0;
  }
});

function applyDuration(months) {
  if (!formData.startDate) return;
  const date = new Date(formData.startDate);
  date.setMonth(date.getMonth() + months);
  formData.expiry = date.toISOString().split("T")[0];
}

function applyCycleDuration(type) {
  if (type === "month") applyDuration(1);
  if (type === "quarter") applyDuration(3);
  if (type === "halfyear") applyDuration(6);
  if (type === "year") applyDuration(12);
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

function save() {
  emit("save", { ...formData });
}

// Generate history based on startDate and cycle
const calculatedHistory = computed(() => {
  if (!formData.startDate || !formData.price) return [];

  const hist = [];
  const start = new Date(formData.startDate);
  const now = new Date();
  const expiry = new Date(formData.expiry);
  const format = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: formData.currency,
  });

  let current = new Date(start);

  // Determine the stop date for history
  // If autoRenew is off or sub is inactive, stop at expiry
  // Otherwise, calculate up to today
  let limitDate = now;
  if (!formData.autoRenew || formData.status !== "ACTIVE") {
    limitDate = expiry < now ? expiry : now;
  }

  // To catch the payment of the same day
  limitDate.setHours(23, 59, 59, 999);

  while (current <= limitDate) {
    hist.push({
      date: current.toISOString().split("T")[0],
      amount: format.format(formData.price),
      status: "Paid",
    });

    const cycle = formData.cycle || "Monthly";
    if (cycle === "Monthly") {
      current.setMonth(current.getMonth() + 1);
    } else if (cycle === "Quarterly") {
      current.setMonth(current.getMonth() + 3);
    } else if (cycle === "Semi-Annually") {
      current.setMonth(current.getMonth() + 6);
    } else {
      current.setFullYear(current.getFullYear() + 1);
    }

    // Safety break (e.g., 100 years of monthly payments is ~1200)
    if (hist.length > 2000) break;
  }

  // Return all payments, most recent first
  return hist.reverse();
});
</script>

<template>
  <div class="modal-overlay" @click.self="$emit('cancel')">
    <div class="modal-content">
      <header class="modal-header">
        <div class="header-title">
          <h3>
            {{ isEditing ? "Subscription Detail" : "Add New Subscription" }}
          </h3>
          <p class="eyebrow" v-if="isEditing">{{ formData.name }}</p>
        </div>
        <div class="header-actions">
          <button
            class="icon-btn danger"
            v-if="isEditing"
            @click="$emit('delete', formData.id)"
            title="Delete"
          >
            <svg viewBox="0 0 24 24"><path :d="iconPaths.trash" /></svg>
          </button>
          <button
            class="icon-btn close-modal"
            @click="$emit('cancel')"
            title="Close"
          >
            <svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>
      </header>

      <div class="content-grid">
        <!-- Left Column: Form -->
        <div class="card form-card">
          <form @submit.prevent="save">
            <div class="form-section">
              <h3 class="section-title">Basic Information</h3>

              <div class="form-group">
                <label>Service Name</label>
                <div class="input-with-icon">
                  <input
                    v-model="formData.name"
                    type="text"
                    required
                    placeholder="e.g. Netflix, Spotify..."
                  />
                  <svg viewBox="0 0 24 24"><path :d="iconPaths.edit" /></svg>
                </div>
              </div>

              <div class="form-row pricing">
                <div class="form-group grow">
                  <label>Price</label>
                  <input
                    v-model.number="formData.price"
                    type="number"
                    step="any"
                    required
                  />
                </div>
                <div class="form-group">
                  <label>Currency</label>
                  <select v-model="formData.currency">
                    <option value="VND">₫ VND</option>
                    <option value="USD">$ USD</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Billing Cycle</label>
                  <select v-model="formData.cycle">
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Semi-Annually">Semi-Annually</option>
                    <option value="Annually">Annually</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="form-section">
              <label>Billing Period</label>
              <div class="form-row dates">
                <div class="form-group">
                  <label>Start</label>
                  <input v-model="formData.startDate" type="date" required />
                </div>
                <div class="form-group">
                  <label>Expiry</label>
                  <input v-model="formData.expiry" type="date" required />
                </div>
              </div>
              <div class="duration-options">
                <button
                  type="button"
                  class="duration-btn"
                  @click="applyCycleDuration('month')"
                >
                  1 Month
                </button>
                <button
                  type="button"
                  class="duration-btn"
                  @click="applyCycleDuration('quarter')"
                >
                  3 Months
                </button>
                <button
                  type="button"
                  class="duration-btn"
                  @click="applyCycleDuration('halfyear')"
                >
                  6 Months
                </button>
                <button
                  type="button"
                  class="duration-btn"
                  @click="applyCycleDuration('year')"
                >
                  1 Year
                </button>
              </div>
            </div>

            <div class="form-section">
              <h3 class="section-title">Category</h3>
              <div class="category-grid">
                <div
                  v-for="cat in categories"
                  :key="cat.id"
                  class="category-item"
                  :class="{ selected: formData.category === cat.id }"
                  @click="
                    formData.category = cat.id;
                    formData.icon = cat.icon;
                  "
                >
                  <svg viewBox="0 0 24 24">
                    <path :d="iconPaths[cat.icon]" />
                  </svg>
                  <span>{{ cat.label }}</span>
                </div>
              </div>
            </div>

            <div class="form-actions">
              <button type="button" class="btn-text" @click="$emit('cancel')">
                Cancel
              </button>
              <button type="submit" class="pill-btn primary">
                Save Changes
              </button>
            </div>
          </form>
        </div>

        <!-- Right Column: Details & History -->
        <div class="sidebar-details">
          <!-- Status Card -->
          <div class="card info-card">
            <div class="info-row status-edit">
              <span>Status</span>
              <select
                v-model="formData.status"
                class="status-select"
                :class="formData.status.toLowerCase()"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
            <div class="info-row" style="margin-top: 12px">
              <label class="toggle-row">
                <input type="checkbox" v-model="formData.autoRenew" />
                <span class="checkbox-custom"></span>
                <span>Auto-renew</span>
              </label>
            </div>
            <div class="info-row" style="margin-top: 12px">
              <label class="toggle-row">
                <input type="checkbox" v-model="formData.familyPlan" />
                <span class="checkbox-custom"></span>
                <span>Family Plan</span>
              </label>
            </div>
            <div
              class="info-group"
              v-if="formData.familyPlan"
              style="margin-top: 16px"
            >
              <label
                style="
                  font-size: 11px;
                  color: var(--muted);
                  display: block;
                  margin-bottom: 8px;
                "
                >Members</label
              >
              <div class="members-input">
                <button
                  type="button"
                  @click="formData.members = Math.max(0, formData.members - 1)"
                >
                  -
                </button>
                <input
                  type="number"
                  v-model.number="formData.members"
                  min="0"
                />
                <button type="button" @click="formData.members++">+</button>
              </div>
            </div>
          </div>

          <!-- Note Card -->
          <div class="card note-card">
            <h3>Notes</h3>
            <textarea
              v-model="formData.note"
              rows="4"
              placeholder="Write a note..."
            ></textarea>
          </div>

          <!-- Mock History -->
          <div class="card history-card" v-if="isEditing">
            <div class="history-header">
              <h3>Payment History</h3>
              <span class="history-count"
                >{{ calculatedHistory.length }} cycles</span
              >
            </div>
            <div class="history-list">
              <div
                class="history-item"
                v-for="(h, i) in calculatedHistory"
                :key="i"
              >
                <div class="h-info">
                  <div class="h-date">{{ h.date }}</div>
                  <div class="h-amount">{{ h.amount }}</div>
                </div>
                <div class="h-badge">
                  <span class="paid-dot"></span>
                  {{ h.status }}
                </div>
              </div>
              <div v-if="calculatedHistory.length === 0" class="empty-history">
                No payment history yet
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  animation: fadeIn 0.2s ease-out;
}

.modal-content {
  background: #0f182c;
  border: 1px solid rgba(255, 255, 255, 0.08);
  width: 100%;
  max-width: 900px;
  max-height: 90vh;
  border-radius: 24px;
  padding: 32px;
  overflow-y: auto;
  box-shadow: 0 40px 80px rgba(0, 0, 0, 0.6);
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}
.header-title h3 {
  font-size: 22px;
  margin: 0;
  color: #fff;
}
.header-title .eyebrow {
  margin-top: 4px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

/* Existing Layout Styles preserved but adapted slightly if needed */
.content-grid {
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: 24px;
}
@media (max-width: 800px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
}

.card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 20px;
  padding: 24px;
}

.section-title {
  font-size: 16px;
  color: #fff;
  margin-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  padding-bottom: 8px;
}

.form-section {
  margin-bottom: 32px;
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
  gap: 10px;
}
.category-item {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s;
}
.category-item svg {
  width: 20px;
  height: 20px;
  stroke: #64748b;
  fill: none;
  stroke-width: 2;
}
.category-item span {
  font-size: 11px;
  color: #92a3c9;
}
.category-item:hover {
  background: rgba(255, 255, 255, 0.08);
}
.category-item.selected {
  background: rgba(123, 91, 255, 0.15);
  border-color: #7b5bff;
}
.category-item.selected svg {
  stroke: #9b7dff;
}
.category-item.selected span {
  color: #fff;
  font-weight: 600;
}

.duration-options {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}
.duration-btn {
  flex: 1;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  color: var(--muted);
  padding: 8px;
  cursor: pointer;
  font-size: 12px;
}
.duration-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  margin-top: 40px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  padding-top: 24px;
}
.btn-text {
  background: none;
  border: none;
  color: var(--muted);
  cursor: pointer;
  font-weight: 600;
}
.btn-text:hover {
  color: #fff;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-badge,
.status-select {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  border: none;
  cursor: pointer;
  appearance: none;
}
.status-select.active {
  background: rgba(58, 222, 139, 0.15);
  color: #3ade8b;
}
.status-select.inactive {
  background: rgba(255, 91, 91, 0.1);
  color: var(--danger);
}
[data-theme="light"] .status-select.active {
  background: #d1fae5;
  color: #065f46;
}
[data-theme="light"] .status-select.inactive {
  background: #fee2e2;
  color: #991b1b;
}

.note-card textarea {
  width: 100%;
  background: rgba(0, 0, 0, 0.2);
  border: none;
  border-radius: 12px;
  padding: 12px;
  color: #fff;
  resize: vertical;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin-top: 8px;
  max-height: 280px;
  overflow-y: auto;
  padding-right: 8px;
}

/* Custom scrollbar for history list */
.history-list::-webkit-scrollbar {
  width: 4px;
}
.history-list::-webkit-scrollbar-track {
  background: transparent;
}
.history-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}
[data-theme="light"] .history-list::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.1);
}
.history-item {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}
.h-date {
  color: var(--muted);
}
.h-amount {
  font-weight: 600;
  color: #fff;
}

[data-theme="light"] .h-amount {
  color: #111827;
}

.members-input {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  padding: 4px;
}
.members-input button {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  cursor: pointer;
  font-size: 18px;
  display: grid;
  place-items: center;
}
.members-input input {
  flex: 1;
  background: transparent;
  border: none;
  color: #fff;
  text-align: center;
  font-weight: 600;
  font-size: 14px;
  outline: none;
}
/* Hide spin buttons */
.members-input input::-webkit-outer-spin-button,
.members-input input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

[data-theme="light"] .members-input {
  background: #f3f4f6;
}
[data-theme="light"] .members-input button {
  background: white;
  color: #111827;
  border: 1px solid #e5e7eb;
}
[data-theme="light"] .members-input input {
  color: #111827;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.history-count {
  font-size: 11px;
  background: rgba(255, 255, 255, 0.05);
  padding: 2px 8px;
  border-radius: 6px;
  color: var(--muted);
}
[data-theme="light"] .history-count {
  background: #f3f4f6;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}
.history-item:last-child {
  border-bottom: none;
}

.h-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.h-date {
  font-size: 11px;
  color: var(--muted);
}
.h-amount {
  font-size: 14px;
}

.h-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #3ade8b;
  font-weight: 600;
}
.paid-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #3ade8b;
  box-shadow: 0 0 8px rgba(58, 222, 139, 0.4);
}

.empty-history {
  text-align: center;
  padding: 24px;
  color: var(--muted);
  font-size: 13px;
  font-style: italic;
}

[data-theme="light"] .modal-content {
  background: #ffffff;
  border-color: #e5e7eb;
}
[data-theme="light"] .header-title h3,
[data-theme="light"] .section-title {
  color: #111827;
}
[data-theme="light"] .section-title,
[data-theme="light"] .form-actions {
  border-color: #e5e7eb;
}
[data-theme="light"] .category-item {
  background: white;
  border-color: #e5e7eb;
}
[data-theme="light"] .category-item:hover {
  background: #f9fafb;
}
[data-theme="light"] .category-item span {
  color: #6b7280;
}
[data-theme="light"] .category-item.selected {
  background: #eff6ff;
  border-color: #3b82f6;
  color: #1d4ed8;
}
[data-theme="light"] .category-item.selected span {
  color: #1d4ed8;
}
[data-theme="light"] .duration-btn {
  background: white;
  border-color: #e5e7eb;
  color: #6b7280;
}
[data-theme="light"] .duration-btn:hover {
  background: #f9fafb;
  color: #111827;
}
[data-theme="light"] .modal-header .icon-btn {
  background: white; /* fallback */
  color: #6b7280;
  border-color: #e5e7eb;
}
[data-theme="light"] .modal-header .icon-btn:hover {
  background: #f3f4f6;
  color: #111827;
}
[data-theme="light"] .btn-text {
  color: #6b7280;
}
[data-theme="light"] .btn-text:hover {
  color: #111827;
}
[data-theme="light"] .note-card textarea {
  background: #f9fafb;
  color: #1f2937;
  border: 1px solid #e5e7eb;
}
[data-theme="light"] .history-item {
  border-color: #e5e7eb;
}

.icon-btn.danger {
  color: #ff4757;
  border-color: rgba(255, 71, 87, 0.3);
  background: rgba(255, 71, 87, 0.1);
}

.icon-btn.danger:hover {
  background: rgba(255, 71, 87, 0.2);
  border-color: #ff4757;
}

[data-theme="light"] .modal-header .icon-btn.danger {
  background: #fee2e2;
  color: #ef4444;
  border-color: #fca5a5;
}
[data-theme="light"] .modal-header .icon-btn.danger:hover {
  background: #fecaca;
  color: #dc2626;
}

@media (max-width: 600px) {
  .modal-content {
    padding: 20px;
    border-radius: 16px;
    height: 95vh;
  }
  .content-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  .form-row {
    flex-direction: column;
    gap: 12px !important;
  }
  .modal-header {
    margin-bottom: 20px;
  }
  .header-actions {
    position: absolute;
    top: 20px;
    right: 20px;
  }
  .header-title {
    padding-right: 60px;
  }
  .form-actions {
    margin-top: 20px;
    flex-direction: column-reverse;
  }
  .pill-btn,
  .btn-text {
    width: 100%;
    justify-content: center;
  }
}
</style>
