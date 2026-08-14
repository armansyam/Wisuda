import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import LoginView from '../views/LoginView.vue'
import DashboardView from '../views/DashboardView.vue'
import InquiriesView from '../views/InquiriesView.vue'
import BookingsView from '../views/BookingsView.vue'
import FreelancersView from '../views/FreelancersView.vue'
import PackagesView from '../views/PackagesView.vue'
import FinancesView from '../views/FinancesView.vue'
import PayrollView from '../views/PayrollView.vue'
import DeliverablesView from '../views/DeliverablesView.vue'
import PortfolioView from '../views/PortfolioView.vue'
import ReportsView from '../views/ReportsView.vue'
import SettingsView from '../views/SettingsView.vue'
import MonitorView from '../views/MonitorView.vue'

const routes = [
  { path: '/admin/login', name: 'login', component: LoginView, meta: { noAuth: true } },
  { path: '/admin', name: 'dashboard', component: DashboardView, meta: { requiresAuth: true } },
  { path: '/admin/inquiries', name: 'inquiries', component: InquiriesView, meta: { requiresAuth: true } },
  { path: '/admin/bookings', name: 'bookings', component: BookingsView, meta: { requiresAuth: true } },
  { path: '/admin/freelancers', name: 'freelancers', component: FreelancersView, meta: { requiresAuth: true } },
  { path: '/admin/packages', name: 'packages', component: PackagesView, meta: { requiresAuth: true } },
  { path: '/admin/archive', alias: '/admin/finances', name: 'archive', component: FinancesView, meta: { requiresAuth: true } },
  { path: '/admin/payroll', name: 'payroll', component: PayrollView, meta: { requiresAuth: true } },
  { path: '/admin/deliverables', name: 'deliverables', component: DeliverablesView, meta: { requiresAuth: true } },
  { path: '/admin/portfolio', name: 'portfolio', component: PortfolioView, meta: { requiresAuth: true } },
  { path: '/admin/reports', name: 'reports', component: ReportsView, meta: { requiresAuth: true } },
  { path: '/admin/settings', name: 'settings', component: SettingsView, meta: { requiresAuth: true } },
  { path: '/admin/monitor', name: 'monitor', component: MonitorView, meta: { requiresAuth: true, isMonitor: true } },
  { path: '/admin/:pathMatch(.*)*', redirect: '/admin' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

let authChecked = false

router.beforeEach(async (to, from, next) => {
  const auth = useAuthStore()
  
  // Ensure auth is checked before deciding
  if (!authChecked) {
    await auth.checkAuth()
    authChecked = true
  }
  
  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    const redirectUrl = to.fullPath && to.fullPath !== '/admin/login' ? to.fullPath : '/admin'
    next({ path: '/admin/login', query: { redirect: redirectUrl } })
  } else if (to.path === '/admin/login' && auth.isLoggedIn) {
    const target = to.query.redirect || '/admin'
    next(target)
  } else {
    next()
  }
})

export default router