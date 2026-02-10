import { createRouter, createWebHashHistory } from "vue-router";
import Dashboard from "../components/Dashboard.vue";
import Subscriptions from "../components/Subscriptions.vue";
import Statistics from "../components/Statistics.vue";
import Settings from "../components/Settings.vue";
import SubscriptionDetail from "../components/SubscriptionDetail.vue";

const routes = [
  {
    path: "/",
    redirect: "/dashboard",
  },
  {
    path: "/dashboard",
    name: "dashboard",
    component: Dashboard,
  },
  {
    path: "/subscriptions",
    name: "subscriptions",
    component: Subscriptions,
  },
  {
    path: "/statistics",
    name: "statistics",
    component: Statistics,
  },
  {
    path: "/settings",
    name: "settings",
    component: Settings,
  },
  {
    path: "/subscription/:id?",
    name: "detail",
    component: SubscriptionDetail,
    props: true,
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
