// 我的看番 - 本地存储管理
import { reactive, watch, computed, ref } from 'vue'

const STORAGE_KEY = 'bangumi_watchlist'
const SEARCH_HISTORY_KEY = 'bangumi_search_history'
const THEME_KEY = 'bangumi_theme'
const API_TOKEN_KEY = 'bangumi_api_token'
const DEFAULT_API_TOKEN = '9pIWozL3IgBi0mGKe5jqKtlixNkRUjLVB9N8iQlM'

/**
 * 从 localStorage 读取数据
 */
function loadFromStorage(key, defaultValue) {
  try {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : defaultValue
  } catch {
    return defaultValue
  }
}

/**
 * 保存到 localStorage
 */
function saveToStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (e) {
    console.error('[Storage] Save failed:', e)
  }
}

// ===================== 看番列表 =====================

const watchlist = reactive(loadFromStorage(STORAGE_KEY, {}))

// 监听变化自动保存
watch(watchlist, (val) => {
  saveToStorage(STORAGE_KEY, val)
}, { deep: true })

/**
 * 添加到看番列表
 */
export function addToWatchlist(subject, status = 'watching') {
  const id = subject.id
  if (watchlist[id]) {
    watchlist[id].status = status
    watchlist[id].updatedAt = Date.now()
    
    // 如果设置为“看完”（completed），自动将集数点满
    if (status === 'completed') {
      const totalEps = watchlist[id].subject.eps_count
      if (totalEps && totalEps > 0) {
        const newEps = []
        for (let i = 1; i <= totalEps; i++) {
          newEps.push(i)
        }
        watchlist[id].watchedEpisodes = newEps
      }
    }
    return
  }

  const epsCount = subject.eps_count || subject.total_episodes || subject.eps || 0
  const watchedEpisodes = []
  if (status === 'completed' && epsCount > 0) {
    for (let i = 1; i <= epsCount; i++) {
      watchedEpisodes.push(i)
    }
  }

  watchlist[id] = {
    subject: {
      id: subject.id,
      name: subject.name,
      name_cn: subject.name_cn,
      images: subject.images,
      eps_count: epsCount,
      rating: subject.rating,
      air_date: subject.air_date || subject.date || ''
    },
    status,
    watchedEpisodes,
    addedAt: Date.now(),
    updatedAt: Date.now()
  }
}

/**
 * 从看番列表移除
 */
export function removeFromWatchlist(subjectId) {
  delete watchlist[subjectId]
}

/**
 * 是否在看番列表中
 */
export function isInWatchlist(subjectId) {
  return !!watchlist[subjectId]
}

/**
 * 获取看番状态
 */
export function getWatchStatus(subjectId) {
  return watchlist[subjectId]?.status || null
}

/**
 * 设置看番状态
 */
export function setWatchStatus(subjectId, status) {
  if (watchlist[subjectId]) {
    watchlist[subjectId].status = status
    watchlist[subjectId].updatedAt = Date.now()

    // 如果设置为“看完”（completed），自动将集数点满
    if (status === 'completed') {
      const totalEps = watchlist[subjectId].subject.eps_count
      if (totalEps && totalEps > 0) {
        const newEps = []
        for (let i = 1; i <= totalEps; i++) {
          newEps.push(i)
        }
        watchlist[subjectId].watchedEpisodes = newEps
      }
    }
  }
}

/**
 * 切换集数观看状态
 */
export function toggleEpisode(subjectId, episodeSort) {
  if (!watchlist[subjectId]) return

  const eps = watchlist[subjectId].watchedEpisodes
  const index = eps.indexOf(episodeSort)

  if (index > -1) {
    eps.splice(index, 1)
  } else {
    eps.push(episodeSort)
    eps.sort((a, b) => a - b)
  }

  watchlist[subjectId].updatedAt = Date.now()
}

/**
 * 标记到某一集（连续模式）
 * 标记该集及之前所有集数为已看
 */
export function markUpToEpisode(subjectId, episodeSort) {
  if (!watchlist[subjectId]) return

  const newEps = []
  for (let i = 1; i <= episodeSort; i++) {
    newEps.push(i)
  }

  watchlist[subjectId].watchedEpisodes = newEps
  watchlist[subjectId].updatedAt = Date.now()

  // 如果标记了所有集数，自动标记为已看完
  const totalEps = watchlist[subjectId].subject.eps_count
  if (totalEps && newEps.length >= totalEps) {
    watchlist[subjectId].status = 'completed'
  }
}

/**
 * 清除某一集的标记（取消从该集到最后的标记）
 */
export function unmarkFromEpisode(subjectId, episodeSort) {
  if (!watchlist[subjectId]) return

  watchlist[subjectId].watchedEpisodes = watchlist[subjectId].watchedEpisodes
    .filter(ep => ep < episodeSort)

  watchlist[subjectId].updatedAt = Date.now()
}

/**
 * 设置观看的集数数组
 */
export function setWatchedEpisodes(subjectId, watchedEpisodes) {
  if (!watchlist[subjectId]) return
  watchlist[subjectId].watchedEpisodes = [...watchedEpisodes].sort((a, b) => a - b)
  watchlist[subjectId].updatedAt = Date.now()

  // 如果标记了所有集数，自动标记为已看完
  const totalEps = watchlist[subjectId].subject.eps_count
  if (totalEps && watchlist[subjectId].watchedEpisodes.length >= totalEps) {
    watchlist[subjectId].status = 'completed'
  } else if (watchlist[subjectId].status === 'completed') {
    // 如果之前是已看完，现在未满，切换回在看状态
    watchlist[subjectId].status = 'watching'
  }
}

/**
 * 在看番列表增加一集进度 (MyBangumi中使用，适配第二季等特殊起始集数)
 */
export function incrementWatchlistProgress(subjectId) {
  const item = watchlist[subjectId]
  if (!item) return null

  const watched = item.watchedEpisodes
  const total = item.subject.eps_count || 0
  if (total === 0 || watched.length >= total) return null

  let nextEp = 1
  if (watched.length > 0) {
    nextEp = Math.max(...watched) + 1
  } else {
    nextEp = 1
  }

  if (!watched.includes(nextEp)) {
    watched.push(nextEp)
    watched.sort((a, b) => a - b)
  }
  item.updatedAt = Date.now()

  if (watched.length >= total) {
    item.status = 'completed'
  }
  return nextEp
}

/**
 * 获取已观看的集数
 */
export function getWatchedEpisodes(subjectId) {
  return watchlist[subjectId]?.watchedEpisodes || []
}

/**
 * 检查某一集是否已看
 */
export function isEpisodeWatched(subjectId, episodeSort) {
  if (watchlist[subjectId]?.status === 'completed') return true
  return watchlist[subjectId]?.watchedEpisodes?.includes(episodeSort) || false
}

/**
 * 获取看番进度文本
 */
export function getProgressText(subjectId) {
  const item = watchlist[subjectId]
  if (!item) return ''

  const total = item.subject.eps_count || '?'
  const watched = item.status === 'completed' && total !== '?' ? total : item.watchedEpisodes.length
  return `${watched} / ${total}`
}

/**
 * 获取看番进度百分比
 */
export function getProgressPercent(subjectId) {
  const item = watchlist[subjectId]
  if (!item || !item.subject.eps_count) return 0
  if (item.status === 'completed') return 100
  return Math.round((item.watchedEpisodes.length / item.subject.eps_count) * 100)
}

/**
 * 按状态获取看番列表
 */
export function getWatchlistByStatus(status = null) {
  const entries = Object.values(watchlist)
  if (!status) return entries

  return entries.filter(item => item.status === status)
}

/**
 * 获取统计数据
 */
export function getStats() {
  const entries = Object.values(watchlist)
  return {
    total: entries.length,
    watching: entries.filter(i => i.status === 'watching').length,
    completed: entries.filter(i => i.status === 'completed').length,
    plan: entries.filter(i => i.status === 'plan').length,
    dropped: entries.filter(i => i.status === 'dropped').length,
    totalEpisodesWatched: entries.reduce((sum, i) => sum + i.watchedEpisodes.length, 0)
  }
}

/**
 * 获取响应式 watchlist（用于模板中的响应式绑定）
 */
export function useWatchlist() {
  return watchlist
}

// ===================== 搜索历史 =====================

const searchHistory = reactive(loadFromStorage(SEARCH_HISTORY_KEY, []))

watch(searchHistory, (val) => {
  saveToStorage(SEARCH_HISTORY_KEY, val)
}, { deep: true })

export function addSearchHistory(keyword) {
  if (!keyword?.trim()) return
  const trimmed = keyword.trim()

  // 如果已存在，移到最前
  const index = searchHistory.indexOf(trimmed)
  if (index > -1) {
    searchHistory.splice(index, 1)
  }

  searchHistory.unshift(trimmed)

  // 最多保留 15 条
  if (searchHistory.length > 15) {
    searchHistory.splice(15)
  }
}

export function getSearchHistory() {
  return searchHistory
}

export function clearSearchHistory() {
  searchHistory.splice(0, searchHistory.length)
}

export function removeSearchHistoryItem(keyword) {
  const index = searchHistory.indexOf(keyword)
  if (index > -1) {
    searchHistory.splice(index, 1)
  }
}

// ===================== 主题管理 =====================

const themeData = reactive({
  theme: loadFromStorage(THEME_KEY, 'light')
})

export function getTheme() {
  return themeData.theme
}

export function setTheme(theme) {
  themeData.theme = theme
  saveToStorage(THEME_KEY, theme)
  document.documentElement.setAttribute('data-theme', theme)
}

export function toggleTheme() {
  const newTheme = themeData.theme === 'light' ? 'dark' : 'light'
  setTheme(newTheme)
  return newTheme
}

export function initTheme() {
  document.documentElement.setAttribute('data-theme', themeData.theme)
}

export function useTheme() {
  return themeData
}

// ===================== Toast 通知 =====================
const toastState = reactive({
  visible: false,
  message: '',
  type: 'info', // info | success | error
  timer: null
})

export function showToast(message, type = 'info', duration = 2500) {
  if (toastState.timer) clearTimeout(toastState.timer)

  toastState.visible = true
  toastState.message = message
  toastState.type = type

  toastState.timer = setTimeout(() => {
    toastState.visible = false
  }, duration)
}

export function useToast() {
  return toastState
}

// ===================== API Token 设置 =====================

const apiSettings = reactive({
  token: localStorage.getItem(API_TOKEN_KEY) || DEFAULT_API_TOKEN
})

export function getApiToken() {
  return apiSettings.token || DEFAULT_API_TOKEN
}

export function setApiToken(token) {
  const trimmed = (token || '').trim()
  apiSettings.token = trimmed || DEFAULT_API_TOKEN
  if (trimmed) {
    localStorage.setItem(API_TOKEN_KEY, trimmed)
  } else {
    localStorage.removeItem(API_TOKEN_KEY)
  }
}

export function resetApiToken() {
  apiSettings.token = DEFAULT_API_TOKEN
  localStorage.removeItem(API_TOKEN_KEY)
}

export function getDefaultApiToken() {
  return DEFAULT_API_TOKEN
}

export function useApiSettings() {
  return apiSettings
}

// ===================== 收藏夹管理 =====================
const FOLDERS_KEY = 'bangumi_recommendation_folders'
const storedFolders = loadFromStorage(FOLDERS_KEY, [])
const folders = ref(Array.isArray(storedFolders) ? storedFolders : [])

watch(folders, (val) => {
  saveToStorage(FOLDERS_KEY, val)
}, { deep: true })

export function useFolders() {
  return folders
}

export function addFolder(name) {
  const trimmed = (name || '').trim()
  if (!trimmed) return null
  const exists = folders.value.find(f => f.name === trimmed)
  if (exists) return exists
  const newFolder = {
    id: 'folder_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    name: trimmed,
    createdAt: Date.now()
  }
  folders.value.push(newFolder)
  return newFolder
}

export function renameFolder(id, newName) {
  const trimmed = (newName || '').trim()
  if (!trimmed) return
  const folder = folders.value.find(f => f.id === id)
  if (folder) {
    folder.name = trimmed
  }
}

export function deleteFolder(id) {
  const index = folders.value.findIndex(f => f.id === id)
  if (index > -1) {
    folders.value.splice(index, 1)
    // 更新对应番剧，解除分类绑定
    Object.keys(watchlist).forEach(key => {
      if (watchlist[key].folderId === id) {
        watchlist[key].folderId = null
        watchlist[key].updatedAt = Date.now()
      }
    })
  }
}

export function moveAnimeToFolder(animeId, folderId) {
  if (watchlist[animeId]) {
    watchlist[animeId].folderId = folderId
    watchlist[animeId].updatedAt = Date.now()
  }
}

