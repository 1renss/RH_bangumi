<template>
  <div id="rh-app">
    <NavBar />
    <router-view v-slot="{ Component }">
      <transition name="page" mode="out-in">
        <component :is="Component" :key="$route.fullPath" />
      </transition>
    </router-view>
    <!-- Toast 通知 -->
    <transition name="page">
      <div v-if="toast.visible" :class="['toast', `toast--${toast.type}`]">
        <span v-if="toast.type === 'success'">✅</span>
        <span v-else-if="toast.type === 'error'">❌</span>
        <span v-else>ℹ️</span>
        {{ toast.message }}
      </div>
    </transition>
    <!-- 回到顶部 -->
    <transition name="page">
      <button v-if="showBackTop" class="back-to-top" @click="scrollToTop" title="回到顶部">
        ↑
      </button>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import NavBar from './components/NavBar.vue'
import { useToast } from './stores/watchlist'

const toast = useToast()
const showBackTop = ref(false)

function handleScroll() {
  showBackTop.value = window.scrollY > 400
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<style scoped>
#rh-app {
  min-height: 100vh;
}
</style>
