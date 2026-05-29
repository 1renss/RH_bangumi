<template>
  <div class="page-container with-padding-top">
    <!-- 搜索区域 -->
    <div class="search-header animate-fadeInUp">
      <h1 class="search-header__title">🔍 搜索番剧</h1>
      <div class="search-bar">
        <input
          v-model="keyword"
          class="search-bar__input"
          placeholder="输入番剧名称搜索..."
          @keyup.enter="doSearch"
          id="search-page-input"
        />
        <button class="btn btn-primary" @click="doSearch" id="search-page-btn">
          搜索
        </button>
      </div>
    </div>

    <!-- 筛选区域 -->
    <div class="filters-section animate-fadeInUp" style="animation-delay: 0.05s;">
      <!-- 年份筛选 -->
      <div class="filter-group">
        <div class="filter-group__header">
          <h3 class="filter-group__title">📅 年份</h3>
          <button v-if="selectedYear" class="filter-clear" @click="clearYear">清除</button>
        </div>
        <div class="year-filter">
          <button
            :class="['year-btn', { 'year-btn--active': selectedYear === null }]"
            @click="selectYear(null)"
          >
            全部
          </button>
          <button
            v-for="year in years"
            :key="year"
            :class="['year-btn', { 'year-btn--active': selectedYear === year }]"
            @click="selectYear(year)"
          >
            {{ year }}
          </button>
        </div>
      </div>

      <!-- 季度筛选 -->
      <div class="filter-group">
        <div class="filter-group__header">
          <h3 class="filter-group__title">🌸 季度</h3>
          <button v-if="selectedSeason" class="filter-clear" @click="clearSeason">清除</button>
        </div>
        <div class="season-filter">
          <button
            :class="['season-btn', { 'season-btn--active': selectedSeason === null }]"
            @click="selectSeason(null)"
          >
            全部
          </button>
          <button
            v-for="s in seasons"
            :key="s.value"
            :class="['season-btn', { 'season-btn--active': selectedSeason === s.value }]"
            @click="selectSeason(s.value)"
          >
            <span class="season-btn__icon">{{ s.icon }}</span>
            {{ s.label }}
          </button>
        </div>
      </div>

      <!-- 地区筛选 -->
      <div class="filter-group">
        <div class="filter-group__header">
          <h3 class="filter-group__title">🌏 地区</h3>
          <button v-if="selectedCountry" class="filter-clear" @click="clearCountry">清除</button>
        </div>
        <div class="country-filter">
          <button
            :class="['country-btn', { 'country-btn--active': selectedCountry === null }]"
            @click="selectCountry(null)"
          >
            全部
          </button>
          <button
            v-for="c in countries"
            :key="c.value"
            :class="['country-btn', { 'country-btn--active': selectedCountry === c.value }]"
            @click="selectCountry(c.value)"
          >
            <span class="country-btn__icon">{{ c.icon }}</span>
            {{ c.label }}
          </button>
        </div>
      </div>

      <!-- 热门标签 -->
      <div class="filter-group">
        <div class="filter-group__header">
          <h3 class="filter-group__title">🏷️ 标签</h3>
          <button v-if="selectedTag" class="filter-clear" @click="clearTag">清除</button>
        </div>
        <div class="tag-filter">
          <button
            v-for="tag in popularTags"
            :key="tag"
            :class="['tag', { 'tag--active': selectedTag === tag }]"
            @click="selectTag(tag)"
          >
            {{ tag }}
          </button>
        </div>
      </div>

      <!-- 当前筛选条件汇总 -->
      <div v-if="hasFilters" class="active-filters">
        <span class="active-filters__label">当前筛选：</span>
        <span v-if="keyword" class="active-filter-chip">
          🔍 {{ keyword }}
          <button class="active-filter-chip__close" @click="keyword = ''; triggerSearch()">✕</button>
        </span>
        <span v-if="selectedYear" class="active-filter-chip">
          📅 {{ selectedYear }}年
          <button class="active-filter-chip__close" @click="clearYear">✕</button>
        </span>
        <span v-if="selectedSeason" class="active-filter-chip">
          🌸 {{ seasonLabel }}
          <button class="active-filter-chip__close" @click="clearSeason">✕</button>
        </span>
        <span v-if="selectedCountry" class="active-filter-chip">
          🌏 {{ countryLabel }}
          <button class="active-filter-chip__close" @click="clearCountry">✕</button>
        </span>
        <span v-if="selectedTag" class="active-filter-chip">
          🏷️ {{ selectedTag }}
          <button class="active-filter-chip__close" @click="clearTag">✕</button>
        </span>
        <button class="filter-clear" @click="clearAllFilters" style="margin-left: 8px;">全部清除</button>
      </div>
    </div>

    <!-- 搜索结果 -->
    <section class="section">
      <!-- 加载状态 -->
      <LoadingSpinner v-if="loading" text="正在搜索..." />

      <!-- 错误状态 -->
      <div v-else-if="error" class="empty-state">
        <div class="empty-state__icon">😵</div>
        <div class="empty-state__title">搜索出错了</div>
        <div class="empty-state__desc">{{ error }}</div>
        <button class="btn btn-primary" style="margin-top: 16px;" @click="triggerSearch">重试</button>
      </div>

      <!-- 结果列表 -->
      <div v-else-if="filteredResults.length > 0">
        <div class="section__header">
          <h2 class="section__title">搜索结果</h2>
          <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
            <!-- 排序方式 (仅在番图表模式下显示) -->
            <div class="view-toggle" v-if="viewMode === 'table'">
              <button
                :class="['view-toggle-btn', { 'view-toggle-btn--active': sortOrder === 'desc' }]"
                @click="sortOrder = 'desc'"
                title="最新在前"
              >
                🔽 最新在前
              </button>
              <button
                :class="['view-toggle-btn', { 'view-toggle-btn--active': sortOrder === 'asc' }]"
                @click="sortOrder = 'asc'"
                title="最旧在前"
              >
                🔼 最旧在前
              </button>
            </div>

            <!-- 视图切换 -->
            <div class="view-toggle">
              <button
                :class="['view-toggle-btn', { 'view-toggle-btn--active': viewMode === 'card' }]"
                @click="viewMode = 'card'"
                title="卡片视图"
              >
                🎴 卡片
              </button>
              <button
                :class="['view-toggle-btn', { 'view-toggle-btn--active': viewMode === 'table' }]"
                @click="viewMode = 'table'"
                title="时间表"
              >
                📊 番图表
              </button>
            </div>
            <span class="section__more">
              显示 {{ filteredResults.length }} 个
              <span v-if="totalResults">/ 共 {{ totalResults }} 个</span>
            </span>
          </div>
        </div>

        <!-- 卡片视图 -->
        <div v-if="viewMode === 'card'" class="card-grid">
          <AnimeCard
            v-for="item in filteredResults"
            :key="item.id"
            :subject="item"
          />
        </div>
        <!-- 番图表 (时间表视图) -->
        <div v-else class="timeline-wrapper">
          <!-- 贯穿底部的竖向时间轴线 -->
          <div class="timeline-axis"></div>

          <div class="timeline-year-group" v-for="yearGroup in groupedResults" :key="yearGroup.name">
            <!-- 年份节点 -->
            <div class="timeline-year-node">
              <div class="timeline-year-badge">
                📅 {{ yearGroup.name }}
              </div>
            </div>
            
            <!-- 月份行，包含左侧月份节点和右侧卡片网格 -->
            <div class="timeline-month-row" v-for="monthGroup in yearGroup.months" :key="monthGroup.name">
              <div class="timeline-month-node">
                <div class="timeline-month-badge">
                  {{ monthGroup.name }}
                </div>
              </div>
              
              <div class="timeline-content-area">
                <div class="timeline-grid">
                  <div class="timeline-grid-item" v-for="item in monthGroup.items" :key="item.id">
                    <div class="timeline-card">
                      <!-- 封面大图 -->
                      <router-link :to="{ name: 'Detail', params: { id: item.id } }" class="timeline-card__cover-link">
                        <div class="timeline-card__cover">
                          <img :src="getCover(item)" @error="handleImgError" loading="lazy" />
                          
                          <div class="timeline-card__overlay">
                            <span v-if="item.rating?.score" class="timeline-card__rating">★ {{ item.rating.score }}</span>
                            <span v-if="getEps(item)" class="timeline-card__eps">{{ getEps(item) }}话</span>
                          </div>
                        </div>
                      </router-link>
                      
                      <!-- 卡片内容 -->
                      <div class="timeline-card__info">
                        <router-link :to="{ name: 'Detail', params: { id: item.id } }" class="timeline-card__title">
                          {{ getTitle(item) }}
                        </router-link>
                        
                        <!-- 快捷操作按钮 -->
                        <button
                          v-if="isCompleted(item.id)"
                          class="timeline-card-btn timeline-card-btn--completed"
                          @click="toggleComplete(item, false)"
                          title="已看完，点击撤回"
                        >
                          🎉 已看完
                        </button>
                        <button
                          v-else
                          class="timeline-card-btn timeline-card-btn--action"
                          @click="toggleComplete(item, true)"
                        >
                          ✓ 标记看完
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 加载更多 -->
        <div v-if="hasMore && !loadingMore" class="load-more-container animate-fadeInUp">
          <button class="btn btn-secondary btn-load-more" @click="loadMore(25)">
            加载 25 条
          </button>
          <button class="btn btn-secondary btn-load-more" @click="loadMore(100)">
            加载 100 条
          </button>
          <button class="btn btn-primary btn-load-more" @click="loadMore('all')">
            加载全部
          </button>
        </div>
        <LoadingSpinner v-if="loadingMore" text="加载更多..." />
      </div>

      <!-- 有结果但筛选后为空 -->
      <div v-else-if="results.length > 0 && filteredResults.length === 0" class="empty-state">
        <div class="empty-state__icon">🔍</div>
        <div class="empty-state__title">没有符合条件的番剧</div>
        <div class="empty-state__desc">试试调整筛选条件</div>
      </div>

      <!-- 初始状态（无搜索） -->
      <div v-else-if="!searched" class="empty-state">
        <div class="empty-state__icon">🎬</div>
        <div class="empty-state__title">搜索你喜欢的番剧</div>
        <div class="empty-state__desc">输入关键词、选择年份/季度/地区/标签即可开始搜索</div>
      </div>

      <!-- 无结果 -->
      <div v-else class="empty-state">
        <div class="empty-state__icon">😢</div>
        <div class="empty-state__title">没有找到相关番剧</div>
        <div class="empty-state__desc">换个关键词或筛选条件试试</div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { searchSubjects, getLargeImage } from '../api/bangumi'
import {
  addSearchHistory, useWatchlist, addToWatchlist,
  setWatchStatus, showToast
} from '../stores/watchlist'
import AnimeCard from '../components/AnimeCard.vue'
import LoadingSpinner from '../components/LoadingSpinner.vue'

const route = useRoute()
const router = useRouter()

const keyword = ref('')
const results = ref([])
const totalResults = ref(0)
const loading = ref(false)
const loadingMore = ref(false)
const error = ref(null)
const searched = ref(false)
const selectedYear = ref(null)
const selectedSeason = ref(null)
const selectedCountry = ref(null)
const selectedTag = ref(null)
const currentStart = ref(0)
const PAGE_SIZE = 25

// 渐进式按月份倒序拉取（空关键词下的 chronological 浏览）
const currentFetchYear = ref(null)
const currentFetchMonth = ref(null)
const currentMonthOffset = ref(0)
const isChronoBrowsing = computed(() => {
  return !keyword.value.trim() && !selectedTag.value
})

function isWithinChronoBounds() {
  if (!isChronoBrowsing.value) return false
  if (currentFetchYear.value < 2000) return false
  if (selectedYear.value) {
    if (currentFetchYear.value < selectedYear.value) return false
    if (currentFetchYear.value > selectedYear.value) return false
    if (selectedSeason.value) {
      const season = seasons.find(s => s.value === selectedSeason.value)
      if (season) {
        const startMonth = parseInt(season.months[0])
        const endMonth = parseInt(season.months[season.months.length - 1])
        if (currentFetchMonth.value < startMonth || currentFetchMonth.value > endMonth) {
          return false
        }
      }
    }
  }
  return true
}


// 视图模式（卡片/时间表），支持本地缓存持久化
const viewMode = ref(localStorage.getItem('bangumi_search_view_mode') || 'card')
watch(viewMode, (val) => localStorage.setItem('bangumi_search_view_mode', val))

// 排序方式（最新在前/最旧在前）
const sortOrder = ref(localStorage.getItem('bangumi_search_sort_order') || 'desc')
watch(sortOrder, (val) => localStorage.setItem('bangumi_search_sort_order', val))

// 本地收藏库状态，用来标记已看完
const watchlist = useWatchlist()

// 年份列表
const currentYear = new Date().getFullYear()
const years = []
for (let y = currentYear + 1; y >= 2000; y--) {
  years.push(y)
}

// 季度（番剧月份）
const seasons = [
  { value: '01', label: '一月番', icon: '❄️', months: ['01', '02', '03'] },
  { value: '04', label: '四月番', icon: '🌸', months: ['04', '05', '06'] },
  { value: '07', label: '七月番', icon: '☀️', months: ['07', '08', '09'] },
  { value: '10', label: '十月番', icon: '🍂', months: ['10', '11', '12'] }
]

// 地区国家列表
const countries = [
  { value: 'JP', label: '日本', icon: '🇯🇵' },
  { value: 'CN', label: '中国', icon: '🇨🇳' },
  { value: 'US', label: '欧美', icon: '🇺🇸' }
]

// 热门标签
const popularTags = [
  '热血', '恋爱', '搞笑', '日常', '奇幻', '科幻',
  '冒险', '校园', '治愈', '悬疑', '运动', '音乐',
  '机战', '战斗', '百合', '后宫', '异世界', '漫画改',
  '轻小说改', '原创'
]

const hasMore = computed(() => {
  if (isChronoBrowsing.value) {
    if (selectedYear.value) {
      if (currentFetchYear.value < selectedYear.value) return false
      if (currentFetchYear.value > selectedYear.value) return false
      if (selectedSeason.value) {
        const season = seasons.find(s => s.value === selectedSeason.value)
        if (season) {
          const startMonth = parseInt(season.months[0])
          if (currentFetchMonth.value < startMonth) return false
        }
      }
      return true
    }
    return currentFetchYear.value >= 2000
  }
  return results.value.length < totalResults.value
})

const hasFilters = computed(() => {
  return keyword.value || selectedYear.value || selectedSeason.value || selectedTag.value || selectedCountry.value
})

const seasonLabel = computed(() => {
  const s = seasons.find(s => s.value === selectedSeason.value)
  return s ? s.label : ''
})

const countryLabel = computed(() => {
  const c = countries.find(c => c.value === selectedCountry.value)
  return c ? c.label : ''
})

// 客户端过滤（作为 API 数据的一层校验和校准）
const filteredResults = computed(() => {
  let list = results.value

  if (selectedYear.value) {
    list = list.filter(item => {
      const date = item.air_date || item.date || ''
      return date.startsWith(String(selectedYear.value))
    })
  }

  if (selectedSeason.value) {
    const season = seasons.find(s => s.value === selectedSeason.value)
    if (season) {
      list = list.filter(item => {
        const date = item.air_date || item.date || ''
        if (date.length < 7) return false
        const month = date.substring(5, 7)
        return season.months.includes(month)
      })
    }
  }

  if (selectedCountry.value) {
    const countryMap = {
      JP: '日本',
      CN: '中国',
      US: '欧美'
    }
    const metaTag = countryMap[selectedCountry.value]
    if (metaTag) {
      list = list.filter(item => {
        return item.meta_tags && item.meta_tags.includes(metaTag)
      })
    }
  }

  return list
})

// 将筛选出来的番剧按照大年份、小月份进行分组并排序，支持正序/逆序选择
const groupedResults = computed(() => {
  const groups = {}
  const items = [...filteredResults.value]
  
  items.forEach(item => {
    const dateStr = item.date || item.air_date || ''
    let year = '未知年份'
    let month = '未知月份'
    
    if (dateStr && dateStr.length >= 4) {
      year = dateStr.substring(0, 4) + '年'
    }
    if (dateStr && dateStr.length >= 7) {
      month = dateStr.substring(5, 7) + '月'
    }
    
    if (!groups[year]) {
      groups[year] = {}
    }
    if (!groups[year][month]) {
      groups[year][month] = []
    }
    groups[year][month].push(item)
  })
  
  // 年份排序
  const sortedYears = Object.keys(groups).sort((a, b) => {
    if (a === '未知年份') return 1
    if (b === '未知年份') return -1
    return sortOrder.value === 'desc' ? b.localeCompare(a) : a.localeCompare(b)
  })
  
  const result = []
  
  sortedYears.forEach(year => {
    const monthsObj = groups[year]
    // 月份排序
    const sortedMonths = Object.keys(monthsObj).sort((a, b) => {
      if (a === '未知月份') return 1
      if (b === '未知月份') return -1
      return sortOrder.value === 'desc' ? b.localeCompare(a) : a.localeCompare(b)
    })
    
    const monthsList = []
    sortedMonths.forEach(month => {
      // 月份下条目根据具体播放时间进行排序
      const monthItems = [...monthsObj[month]].sort((a, b) => {
        const dateA = a.date || a.air_date || ''
        const dateB = b.date || b.air_date || ''
        return sortOrder.value === 'desc' ? dateB.localeCompare(dateA) : dateA.localeCompare(dateB)
      })
      
      monthsList.push({
        name: month,
        items: monthItems
      })
    })
    
    result.push({
      name: year,
      months: monthsList
    })
  })
  
  return result
})

// 构建 API 搜索关键词 (不混入年份和地区，以防降低搜索命中率)
function buildSearchKeyword() {
  const parts = []
  if (keyword.value.trim()) parts.push(keyword.value.trim())
  if (selectedTag.value && !keyword.value.includes(selectedTag.value)) {
    parts.push(selectedTag.value)
  }
  return parts.join(' ')
}

// 构建 API 级别过滤对象 (直接提交到 API，完美实现大范围的按年/月、国家精确筛选)
function buildExtraFilter() {
  const filter = {}

  // 1. 年份/季度范围过滤
  if (selectedYear.value) {
    const yearStr = String(selectedYear.value)
    if (selectedSeason.value) {
      const season = seasons.find(s => s.value === selectedSeason.value)
      if (season) {
        const startMonth = season.months[0]
        const endMonth = season.months[season.months.length - 1]
        filter.air_date = [`>=${yearStr}-${startMonth}-01`, `<=${yearStr}-${endMonth}-31`]
      }
    } else {
      filter.air_date = [`>=${yearStr}-01-01`, `<=${yearStr}-12-31`]
    }
  }

  // 2. 国家地区过滤
  if (selectedCountry.value) {
    const countryMap = {
      JP: '日本',
      CN: '中国',
      US: '欧美'
    }
    const metaTag = countryMap[selectedCountry.value]
    if (metaTag) {
      filter.meta_tags = [metaTag]
    }
  }

  return filter
}

// 渐进式按月份倒序拉取批次数据 (实现空关键字下的时间轴顺序加载)
async function fetchChronoBatch(targetLimit) {
  let loadedCount = 0

  while (loadedCount < targetLimit && isWithinChronoBounds()) {
    const yearStr = String(currentFetchYear.value)
    const monthStr = String(currentFetchMonth.value).padStart(2, '0')
    
    // 判断当前月份是否需要过滤季度
    let shouldQuery = true
    if (selectedSeason.value) {
      const season = seasons.find(s => s.value === selectedSeason.value)
      if (season && !season.months.includes(monthStr)) {
        shouldQuery = false
      }
    }

    if (shouldQuery) {
      const filter = {
        type: [2],
        air_date: [`>=${yearStr}-${monthStr}-01`, `<=${yearStr}-${monthStr}-31`]
      }
      
      // 国家地区过滤
      if (selectedCountry.value) {
        const countryMap = { JP: '日本', CN: '中国', US: '欧美' }
        const metaTag = countryMap[selectedCountry.value]
        if (metaTag) {
          filter.meta_tags = [metaTag]
        }
      }

      const currentLimit = Math.min(targetLimit - loadedCount, 20)
      const offset = currentMonthOffset.value

      try {
        const data = await searchSubjects("", 2, offset, currentLimit, filter)
        const list = data.list || []
        
        if (list.length > 0) {
          results.value.push(...list)
          loadedCount += list.length
          currentMonthOffset.value += list.length
          currentStart.value = results.value.length
          
          // 如果当前月份拉完了，就迈向下一个月份
          if (list.length < currentLimit) {
            moveToNextMonth()
          }
        } else {
          // 当前月份拉取 0 条，证明拉完了，前进一步
          moveToNextMonth()
        }
      } catch (err) {
        console.error(`Fetch chrono error for ${yearStr}-${monthStr}:`, err)
        break
      }
    } else {
      // 不在季度限定范围内，直接跳过当前月份
      moveToNextMonth()
    }
  }
}

function moveToNextMonth() {
  currentMonthOffset.value = 0
  if (currentFetchMonth.value === 1) {
    currentFetchMonth.value = 12
    currentFetchYear.value--
  } else {
    currentFetchMonth.value--
  }
}

async function triggerSearch() {
  const q = buildSearchKeyword()
  const extraFilter = buildExtraFilter()

  if (keyword.value.trim()) {
    addSearchHistory(keyword.value.trim())
  }

  searched.value = true
  loading.value = true
  error.value = null
  results.value = []
  currentStart.value = 0

  // 更新 URL 状态
  router.replace({
    query: {
      q: keyword.value || undefined,
      year: selectedYear.value || undefined,
      season: selectedSeason.value || undefined,
      country: selectedCountry.value || undefined,
      tag: selectedTag.value || undefined
    }
  })

  try {
    if (isChronoBrowsing.value) {
      if (selectedYear.value) {
        currentFetchYear.value = selectedYear.value
      } else {
        currentFetchYear.value = new Date().getFullYear() + 1
      }

      if (selectedSeason.value) {
        const season = seasons.find(s => s.value === selectedSeason.value)
        currentFetchMonth.value = season ? parseInt(season.months[season.months.length - 1]) : 12
      } else {
        currentFetchMonth.value = 12
      }
      currentMonthOffset.value = 0
      
      results.value = []
      await fetchChronoBatch(20)
      totalResults.value = 1000 // 默认值以在按时间拉取时能不断展示加载更多
      currentStart.value = results.value.length
    } else {
      const data = await searchSubjects(q, 2, 0, 20, extraFilter)
      results.value = data.list || []
      totalResults.value = data.results || 0
      currentStart.value = results.value.length
    }
  } catch (err) {
    error.value = err.message || '搜索失败'
  } finally {
    loading.value = false
  }
}

function doSearch() {
  triggerSearch()
}

async function loadMore(count) {
  if (loadingMore.value) return

  loadingMore.value = true
  error.value = null

  try {
    let targetToLoad = 25
    if (count === 100) {
      targetToLoad = 100
    } else if (count === 'all') {
      targetToLoad = totalResults.value - results.value.length
    }

    if (isChronoBrowsing.value) {
      await fetchChronoBatch(targetToLoad)
      currentStart.value = results.value.length
    } else {
      const q = buildSearchKeyword()
      const extraFilter = buildExtraFilter()
      const CHUNK_SIZE = 20
      const baseOffset = results.value.length
      const chunksCount = Math.ceil(targetToLoad / CHUNK_SIZE)

      // Pre-calculate chunks to load
      const chunks = []
      for (let i = 0; i < chunksCount; i++) {
        const offset = baseOffset + (i * CHUNK_SIZE)
        const limit = Math.min(targetToLoad - (i * CHUNK_SIZE), CHUNK_SIZE)
        chunks.push({ offset, limit })
      }

      // Load chunks concurrently in batches of 5 to respect rate limits while getting 5x speedup
      const CONCURRENCY = 5
      for (let i = 0; i < chunks.length; i += CONCURRENCY) {
        const batch = chunks.slice(i, i + CONCURRENCY)
        const batchPromises = batch.map(c => searchSubjects(q, 2, c.offset, c.limit, extraFilter))
        const dataObjects = await Promise.all(batchPromises)

        let shouldStop = false
        for (let j = 0; j < dataObjects.length; j++) {
          const list = dataObjects[j].list || []
          if (list.length > 0) {
            results.value.push(...list)
          }
          if (list.length < batch[j].limit) {
            shouldStop = true
          }
        }
        currentStart.value = results.value.length
        if (shouldStop) break
      }
    }
  } catch (err) {
    error.value = err.message || '加载失败'
  } finally {
    loadingMore.value = false
  }
}

// 筛选事件处理
function selectYear(year) {
  selectedYear.value = selectedYear.value === year ? null : year
  triggerSearch()
}

function selectSeason(season) {
  selectedSeason.value = selectedSeason.value === season ? null : season
  if (selectedSeason.value && !selectedYear.value) {
    selectedYear.value = currentYear
  }
  triggerSearch()
}

function selectCountry(country) {
  selectedCountry.value = selectedCountry.value === country ? null : country
  triggerSearch()
}

function selectTag(tag) {
  selectedTag.value = selectedTag.value === tag ? null : tag
  triggerSearch()
}

function clearYear() {
  selectedYear.value = null
  if (searched.value) triggerSearch()
}

function clearSeason() {
  selectedSeason.value = null
  if (searched.value) triggerSearch()
}

function clearCountry() {
  selectedCountry.value = null
  if (searched.value) triggerSearch()
}

function clearTag() {
  selectedTag.value = null
  if (searched.value) triggerSearch()
}

function clearAllFilters() {
  keyword.value = ''
  selectedYear.value = null
  selectedSeason.value = null
  selectedCountry.value = null
  selectedTag.value = null
  results.value = []
  searched.value = false
  totalResults.value = 0
  router.replace({ query: {} })
}

// 番图表时间格式化助手
function getYear(item) {
  const date = item.date || item.air_date || ''
  if (date && date.length >= 4) {
    return date.substring(0, 4)
  }
  return '未知'
}

function getMonthDay(item) {
  const date = item.date || item.air_date || ''
  if (date && date.length >= 10) {
    return date.substring(5, 10)
  }
  return '待定'
}

function getCover(item) {
  return getLargeImage(item.images)
}

function getTitle(item) {
  return item.name_cn || item.name || '未知名称'
}

function getEps(item) {
  return item.eps || item.total_episodes || null
}

function handleImgError(e) {
  e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iMTEwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSI4MCIgaGVpZ2h0PSIxMTAiIGZpbGw9IiNlNWU1ZTUiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzk5OSIgZm9udC1zaXplPSIxMCI+5peg5Zu+54mHPC90ZXh0Pjwvc3ZnPg=='
}

// 快捷标记看完逻辑
function isCompleted(id) {
  return watchlist[id]?.status === 'completed'
}

function toggleComplete(subject, markAsCompleted) {
  if (markAsCompleted) {
    addToWatchlist(subject, 'completed')
    showToast(`《${getTitle(subject)}》已设为“看完”，集数进度已自动点满！🎉`, 'success')
  } else {
    setWatchStatus(subject.id, 'watching')
    showToast(`《${getTitle(subject)}》已切换回“在看” 📺`, 'info')
  }
}

// 从 URL 参数初始化
onMounted(() => {
  if (route.query.year) {
    selectedYear.value = parseInt(route.query.year)
  }
  if (route.query.season) {
    selectedSeason.value = route.query.season
    if (!selectedYear.value) {
      selectedYear.value = currentYear
    }
  }
  if (route.query.country) {
    selectedCountry.value = route.query.country
  }
  if (route.query.tag) {
    selectedTag.value = route.query.tag
  }
  if (route.query.q) {
    keyword.value = route.query.q
  }
  // 如果有任何参数，触发搜索
  if (route.query.q || route.query.tag || route.query.year || route.query.season || route.query.country) {
    triggerSearch()
  }
})

// 监听路由变化
watch(() => route.query, (newQuery) => {
  const newQ = newQuery.q || ''
  const newTag = newQuery.tag || null
  const newYear = newQuery.year ? parseInt(newQuery.year) : null
  const newSeason = newQuery.season || null
  const newCountry = newQuery.country || null

  let changed = false
  
  if (keyword.value !== newQ) {
    keyword.value = newQ
    changed = true
  }
  if (selectedTag.value !== newTag) {
    selectedTag.value = newTag
    changed = true
  }
  if (selectedYear.value !== newYear) {
    selectedYear.value = newYear
    changed = true
  }
  if (selectedSeason.value !== newSeason) {
    selectedSeason.value = newSeason
    changed = true
  }
  if (selectedCountry.value !== newCountry) {
    selectedCountry.value = newCountry
    changed = true
  }

  if (changed || (!searched.value && (newQ || newTag || newYear || newSeason || newCountry))) {
    triggerSearch()
  } else if (!newQ && !newTag && !newYear && !newSeason && !newCountry && !searched.value) {
    // 状态全清空了且未搜索过，返回初始状态
    results.value = []
    searched.value = false
    totalResults.value = 0
  }
}, { deep: true })
</script>

<style scoped>
.search-header {
  text-align: center;
  margin-bottom: 24px;
  padding-top: 20px;
}

.search-header__title {
  font-size: 1.8rem;
  font-weight: 900;
  margin-bottom: 20px;
  background: linear-gradient(135deg, var(--bili-pink), var(--bili-blue));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.search-bar {
  display: flex;
  max-width: 600px;
  margin: 0 auto;
  gap: 12px;
}

.search-bar__input {
  flex: 1;
  height: 48px;
  padding: 0 20px;
  border: 2px solid var(--border-color);
  border-radius: 24px;
  background: var(--bg-card);
  color: var(--text-primary);
  font-size: 0.95rem;
  transition: all var(--transition-fast);
}

.search-bar__input:focus {
  border-color: var(--bili-pink);
  box-shadow: 0 0 0 4px rgba(251, 114, 153, 0.1);
}

/* Filters Section */
.filters-section {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 20px 24px;
  margin-bottom: 28px;
  box-shadow: var(--shadow-card);
  border: 1px solid var(--border-light);
}

.filter-group {
  margin-bottom: 16px;
}

.filter-group:last-child {
  margin-bottom: 0;
}

.filter-group__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.filter-group__title {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.filter-clear {
  font-size: 0.78rem;
  color: var(--text-tertiary);
  cursor: pointer;
  background: none;
  border: none;
  padding: 2px 6px;
  border-radius: 4px;
  transition: all var(--transition-fast);
}

.filter-clear:hover {
  color: var(--bili-pink);
  background: rgba(251, 114, 153, 0.06);
}

/* Season & Country Filter */
.season-filter,
.country-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.season-btn,
.country-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 500;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border: 1.5px solid var(--border-color);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.season-btn:hover,
.country-btn:hover {
  border-color: var(--bili-pink);
  color: var(--bili-pink);
}

.season-btn--active,
.country-btn--active {
  background: var(--bili-pink);
  color: white;
  border-color: var(--bili-pink);
  box-shadow: 0 2px 8px rgba(251, 114, 153, 0.25);
}

.season-btn__icon,
.country-btn__icon {
  font-size: 1rem;
}

/* Tag Filter */
.tag-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* Active Filters Bar */
.active-filters {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 16px;
  margin-top: 16px;
  border-top: 1px solid var(--border-light);
}

.active-filters__label {
  font-size: 0.82rem;
  color: var(--text-tertiary);
  font-weight: 500;
}

.active-filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: rgba(251, 114, 153, 0.1);
  color: var(--bili-pink);
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
  border: 1px solid rgba(251, 114, 153, 0.2);
}

.active-filter-chip__close {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  border-radius: 50%;
  background: none;
  border: none;
  color: var(--bili-pink);
  cursor: pointer;
  transition: background var(--transition-fast);
  padding: 0;
}

.active-filter-chip__close:hover {
  background: rgba(251, 114, 153, 0.2);
}

.load-more {
  text-align: center;
  padding: 32px 0;
}

</style>
