import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Home.vue'),
    meta: { title: '首页 - RH番剧记录' }
  },
  {
    path: '/search',
    name: 'Search',
    component: () => import('../views/Search.vue'),
    meta: { title: '搜索 - RH番剧记录' }
  },
  {
    path: '/subject/:id',
    name: 'Detail',
    component: () => import('../views/Detail.vue'),
    meta: { title: '番剧详情' }
  },
  {
    path: '/my-bangumi',
    name: 'MyBangumi',
    component: () => import('../views/MyBangumi.vue'),
    meta: { title: '我的看番 - RH番剧记录' }
  },
  {
    path: '/recommendations',
    name: 'Recommendations',
    component: () => import('../views/Recommendations.vue'),
    meta: { title: '荐番 - RH番剧记录' }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    return { top: 0, behavior: 'smooth' }
  }
})

router.beforeEach((to, from, next) => {
  document.title = to.meta.title || 'RH番剧记录系统'
  next()
})

export default router
