<template>
  <nav class="navbar">
    <div class="navbar__inner">
      <!-- Logo -->
      <router-link to="/" class="navbar__logo">
        <span class="navbar__logo-icon">📺</span>
        <span>RH番剧记录</span>
      </router-link>

      <!-- 搜索框 -->
      <div class="navbar__search" ref="searchWrapperRef">
        <input
          v-model="searchQuery"
          class="navbar__search-input"
          placeholder="搜索番剧..."
          @keyup.enter="doSearch"
          @focus="showHistory = true"
          @input="showHistory = true"
          id="nav-search-input"
        />
        <button class="navbar__search-btn" @click="doSearch" id="nav-search-btn">
          🔍
        </button>

        <!-- 搜索历史 -->
        <div v-if="showHistory && history.length > 0 && !searchQuery" class="search-history animate-slideDown">
          <div class="search-history__header">
            <span>搜索历史</span>
            <span class="search-history__clear" @click.stop="clearHistory">清空</span>
          </div>
          <div
            v-for="item in history"
            :key="item"
            class="search-history__item"
            @click="selectHistory(item)"
          >
            <span>🕐</span>
            <span>{{ item }}</span>
          </div>
        </div>
      </div>

      <!-- 导航链接 -->
      <div class="navbar__nav">
        <router-link to="/" class="navbar__link" id="nav-home">
          🏠 <span>首页</span>
        </router-link>
        <router-link to="/search" class="navbar__link" id="nav-search">
          🔍 <span>搜索</span>
        </router-link>
        <router-link to="/recommendations" class="navbar__link" id="nav-recommendations">
          👍 <span>荐番</span>
        </router-link>
        <router-link to="/my-bangumi" class="navbar__link" id="nav-mybangumi">
          ❤️ <span>我的看番</span>
          <span v-if="watchCount > 0" class="badge" style="margin-left: 4px;">{{ watchCount }}</span>
        </router-link>

        <!-- 主题切换 -->
        <button class="navbar__theme-btn" @click="handleToggleTheme" id="nav-theme-toggle">
          {{ currentTheme === 'light' ? '🌙' : '☀️' }}
        </button>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  getSearchHistory, addSearchHistory, clearSearchHistory,
  toggleTheme, useTheme, useWatchlist, getStats
} from '../stores/watchlist'

const router = useRouter()
const searchQuery = ref('')
const showHistory = ref(false)
const searchWrapperRef = ref(null)
const history = getSearchHistory()
const themeData = useTheme()
const watchlist = useWatchlist()

const currentTheme = computed(() => themeData.theme)
const watchCount = computed(() => getStats().watching)

function doSearch() {
  const q = searchQuery.value.trim()
  if (!q) return
  addSearchHistory(q)
  showHistory.value = false
  router.push({ name: 'Search', query: { q } })
}

function selectHistory(item) {
  searchQuery.value = item
  showHistory.value = false
  doSearch()
}

function clearHistory() {
  clearSearchHistory()
  showHistory.value = false
}

function handleToggleTheme() {
  toggleTheme()
}

// 点击外部关闭搜索历史
function handleClickOutside(e) {
  if (searchWrapperRef.value && !searchWrapperRef.value.contains(e.target)) {
    showHistory.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>
