import { createRouter, createWebHashHistory } from 'vue-router'

import HomeView from '../views/HomeView.vue'
import LoginView from '../views/LoginView.vue'
import InscriptionView from '../views/InscriptionView.vue'
import ProfilView from '../views/ProfilView.vue'
import ReservationView from '../views/ReservationView.vue'

const routes = [

  // 🏠 INSCRIPTION
  {
    path: '/',
    name: 'register',
    component: InscriptionView
  },

  // 🔐 LOGIN
  {
    path: '/login',
    name: 'login',
    component: LoginView
  },

  // 👤 PROFIL
  {
    path: '/profil',
    name: 'profil',
    component: ProfilView
  },

  // 🗺️ MAP
  {
    path: '/map',
    name: 'map',
    component: HomeView
  },

  // 🅿️ RESERVATION (IMPORTANT)
  {
    path: '/reservation',
    name: 'reservation',
    component: ReservationView
  }

]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

/* 🔥 FLOW SIMPLE ET STABLE */
router.beforeEach((to, from, next) => {

  let user = {}

  try {
    user = JSON.parse(localStorage.getItem("user")) || {}
  } catch (e) {
    user = {}
  }

  const isLogged = !!(user.id || user.id_conducteur)

  const isProfileComplete =
    user.nom && user.prenom && user.email

  // ❌ pas connecté → login
  if (!isLogged) {
    if (to.path !== "/" && to.path !== "/login") {
      return next("/login")
    }
    return next()
  }

  // 🔐 connecté mais profil incomplet → profil obligatoire
  if (isLogged && !isProfileComplete) {
    if (to.path !== "/profil") {
      return next("/profil")
    }
    return next()
  }

  // 🚀 accès normal
  next()
})

export default router