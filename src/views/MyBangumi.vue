<template>
  <div class="page-container with-padding-top">
    <h1 class="mybangumi-title animate-fadeInUp">❤️ 我的看番</h1>

    <!-- 统计卡片 -->
    <div class="stats-grid animate-fadeInUp" style="animation-delay: 0.05s;">
      <div class="stat-card">
        <div class="stat-card__number">{{ stats.total }}</div>
        <div class="stat-card__label">总计</div>
      </div>
      <div class="stat-card" @click="setTab('watching')" style="cursor:pointer;">
        <div class="stat-card__number" style="background: linear-gradient(135deg, #00a1d6, #23ade5); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;">
          {{ stats.watching }}
        </div>
        <div class="stat-card__label">在看</div>
      </div>
      <div class="stat-card" @click="setTab('completed')" style="cursor:pointer;">
        <div class="stat-card__number" style="background: linear-gradient(135deg, #4caf50, #66bb6a); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;">
          {{ stats.completed }}
        </div>
        <div class="stat-card__label">看完</div>
      </div>
      <div class="stat-card" @click="setTab('plan')" style="cursor:pointer;">
        <div class="stat-card__number" style="background: linear-gradient(135deg, #ff9800, #ffb74d); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;">
          {{ stats.plan }}
        </div>
        <div class="stat-card__label">想看</div>
      </div>
      <div class="stat-card" @click="setTab('dropped')" style="cursor:pointer;">
        <div class="stat-card__number" style="background: linear-gradient(135deg, #9e9e9e, #bdbdbd); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;">
          {{ stats.dropped }}
        </div>
        <div class="stat-card__label">弃番</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__number">{{ stats.totalEpisodesWatched }}</div>
        <div class="stat-card__label">看过话数</div>
      </div>
    </div>

    <!-- Tab 切换 -->
    <div class="tabs animate-fadeInUp" style="animation-delay: 0.1s; margin-bottom: 24px;">
      <div
        :class="['tab', { 'tab--active': activeTab === 'all' }]"
        @click="setTab('all')"
      >全部 ({{ stats.total }})</div>
      <div
        :class="['tab', { 'tab--active': activeTab === 'watching' }]"
        @click="setTab('watching')"
      >在看 ({{ stats.watching }})</div>
      <div
        :class="['tab', { 'tab--active': activeTab === 'completed' }]"
        @click="setTab('completed')"
      >看完 ({{ stats.completed }})</div>
      <div
        :class="['tab', { 'tab--active': activeTab === 'plan' }]"
        @click="setTab('plan')"
      >想看 ({{ stats.plan }})</div>
      <div
        :class="['tab', { 'tab--active': activeTab === 'dropped' }]"
        @click="setTab('dropped')"
      >弃番 ({{ stats.dropped }})</div>
    </div>

    <!-- 视图与排序切换 -->
    <div style="display: flex; justify-content: flex-end; align-items: center; gap: 12px; margin-bottom: 16px; flex-wrap: wrap;" class="animate-fadeInUp">
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
          :class="['view-toggle-btn', { 'view-toggle-btn--active': viewMode === 'list' }]"
          @click="viewMode = 'list'"
          title="列表视图"
        >
          🎴 列表
        </button>
        <button
          :class="['view-toggle-btn', { 'view-toggle-btn--active': viewMode === 'table' }]"
          @click="viewMode = 'table'"
          title="时间表"
        >
          📊 番图表
        </button>
      </div>
    </div>

    <!-- 列表/时间轴展现 -->
    <template v-if="filteredList.length > 0">
      <!-- 列表模式 -->
      <div v-if="viewMode === 'list'" class="watchlist animate-fadeInUp" style="animation-delay: 0.15s;">
        <div
          v-for="item in filteredList"
          :key="item.subject.id"
          class="watchlist-card"
        >
          <router-link :to="{ name: 'Detail', params: { id: item.subject.id } }" class="watchlist-card__cover">
            <img
              :src="getCover(item.subject)"
              :alt="getTitle(item.subject)"
              @error="handleImgError"
            />
          </router-link>
          <div class="watchlist-card__body">
            <div>
              <router-link
                :to="{ name: 'Detail', params: { id: item.subject.id } }"
                class="watchlist-card__title"
              >
                {{ getTitle(item.subject) }}
              </router-link>
              <div class="watchlist-card__meta">
                <span v-if="item.subject.air_date">{{ item.subject.air_date }}</span>
                <span v-if="item.subject.rating?.score"> · ★ {{ item.subject.rating.score }}</span>
              </div>
            </div>

            <!-- 进度 -->
            <div>
              <div class="watchlist-card__progress">
                <div class="progress-bar" style="flex: 1;">
                  <div
                    class="progress-bar__fill"
                    :style="{ width: getPercent(item) + '%' }"
                  ></div>
                </div>
                <span class="watchlist-card__progress-text">
                  {{ getProgressText(item.subject.id) }}
                </span>
              </div>

              <div class="watchlist-card__actions">
                <!-- 状态切换 -->
                <select
                  class="status-select"
                  :value="item.status"
                  @change="changeStatus(item.subject.id, $event.target.value)"
                >
                  <option value="watching">在看</option>
                  <option value="completed">看完</option>
                  <option value="plan">想看</option>
                  <option value="dropped">弃番</option>
                </select>
                <router-link :to="{ name: 'Detail', params: { id: item.subject.id } }" class="btn btn-sm btn-secondary">
                  管理进度
                </router-link>
                <button class="btn btn-sm btn-danger" @click="removeItem(item.subject.id)">
                  移除
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 番图表时间表模式 -->
      <div v-else class="timeline-wrapper animate-fadeInUp" style="animation-delay: 0.15s;">
        <div class="timeline-axis"></div>

        <div class="timeline-year-group" v-for="yearGroup in groupedWatchlist" :key="yearGroup.name">
          <div class="timeline-year-node">
            <div class="timeline-year-badge">
              📅 {{ yearGroup.name }}
            </div>
          </div>
          
          <div class="timeline-month-row" v-for="monthGroup in yearGroup.months" :key="monthGroup.name">
            <div class="timeline-month-node">
              <div class="timeline-month-badge">
                {{ monthGroup.name }}
              </div>
            </div>
            
            <div class="timeline-content-area">
              <div class="timeline-grid">
                <div class="timeline-grid-item" v-for="item in monthGroup.items" :key="item.subject.id">
                  <div class="timeline-card">
                    <!-- 封面 -->
                    <router-link :to="{ name: 'Detail', params: { id: item.subject.id } }" class="timeline-card__cover-link">
                      <div class="timeline-card__cover">
                        <img :src="getCover(item.subject)" @error="handleImgError" loading="lazy" />
                        
                        <div class="timeline-card__overlay">
                          <span v-if="item.subject.rating?.score" class="timeline-card__rating">★ {{ item.subject.rating.score }}</span>
                          <span v-if="item.subject.eps_count" class="timeline-card__eps">{{ item.subject.eps_count }}话</span>
                        </div>
                      </div>
                    </router-link>
                    
                    <!-- 信息 & 进度 -->
                    <div class="timeline-card__info">
                      <router-link :to="{ name: 'Detail', params: { id: item.subject.id } }" class="timeline-card__title">
                        {{ getTitle(item.subject) }}
                      </router-link>

                      <!-- 进度条 -->
                      <div class="progress-bar-container" style="margin-top: 4px;">
                        <div class="progress-bar">
                          <div class="progress-bar__fill" :style="{ width: getPercent(item) + '%' }"></div>
                        </div>
                        <div class="progress-text-small" style="font-size: 0.72rem; color: var(--text-tertiary); text-align: right; margin-top: 2px;">
                          {{ getProgressText(item.subject.id) }}
                        </div>
                      </div>
                      
                      <!-- 快捷操作：加一集 / 已看完 -->
                      <div style="display: flex; gap: 6px; align-items: center; margin-top: 4px;">
                        <button
                          v-if="item.status !== 'completed'"
                          class="timeline-card-btn timeline-card-btn--action"
                          @click="incrementProgress(item)"
                          title="看完下一集"
                          style="flex: 1;"
                        >
                          ➕1集 (第{{ getNextEpNumber(item) }}集)
                        </button>
                        <div
                          v-else
                          class="timeline-card-btn timeline-card-btn--completed"
                          style="flex: 1; cursor: default;"
                        >
                          🎉 已看完
                        </div>
                        
                        <!-- 状态修改下拉 -->
                        <select
                          class="status-select"
                          :value="item.status"
                          @change="changeStatus(item.subject.id, $event.target.value)"
                          style="width: auto; padding: 4px 6px; height: 34px; border-radius: 17px; text-align: center;"
                        >
                          <option value="watching">在看</option>
                          <option value="completed">看完</option>
                          <option value="plan">想看</option>
                          <option value="dropped">弃番</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- 空状态 -->
    <div v-else class="empty-state animate-fadeInUp">
      <div class="empty-state__icon">📭</div>
      <div class="empty-state__title">
        {{ activeTab === 'all' ? '还没有追番呢' : '这个分类还没有番剧' }}
      </div>
      <div class="empty-state__desc">
        去搜索页面发现你喜欢的番剧吧！
      </div>
      <router-link to="/search" class="btn btn-primary" style="margin-top: 16px;">
        🔍 搜索番剧
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import {
  useWatchlist, getWatchlistByStatus, getStats,
  setWatchStatus, removeFromWatchlist, showToast,
  getProgressPercent, getProgressText, incrementWatchlistProgress
} from '../stores/watchlist'
import { getLargeImage } from '../api/bangumi'

const watchlist = useWatchlist()
const activeTab = ref('all')

const viewMode = ref(localStorage.getItem('bangumi_my_view_mode') || 'list')
watch(viewMode, (val) => localStorage.setItem('bangumi_my_view_mode', val))

const sortOrder = ref(localStorage.getItem('bangumi_my_sort_order') || 'desc')
watch(sortOrder, (val) => localStorage.setItem('bangumi_my_sort_order', val))

const stats = computed(() => getStats())

const filteredList = computed(() => {
  const status = activeTab.value === 'all' ? null : activeTab.value
  const list = getWatchlistByStatus(status)
  // 按更新时间排序，最新在前
  return list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
})

const groupedWatchlist = computed(() => {
  const groups = {}
  const items = [...filteredList.value]
  
  items.forEach(item => {
    const dateStr = item.subject.air_date || ''
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
      // 排序
      const monthItems = [...monthsObj[month]].sort((a, b) => {
        const dateA = a.subject.air_date || ''
        const dateB = b.subject.air_date || ''
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

function setTab(tab) {
  activeTab.value = tab
}

function getTitle(subject) {
  return subject.name_cn || subject.name || '未知'
}

function getCover(subject) {
  return getLargeImage(subject.images)
}

function getPercent(item) {
  return getProgressPercent(item.subject.id)
}

function handleImgError(e) {
  e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iMTEwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSI4MCIgaGVpZ2h0PSIxMTAiIGZpbGw9IiNlNWU1ZTUiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzk5OSIgZm9udC1zaXplPSIxMCI+5peg5Zu+54mHPC90ZXh0Pjwvc3ZnPg=='
}

function changeStatus(id, status) {
  setWatchStatus(id, status)
  showToast(`状态已更新`, 'success')
}

function removeItem(id) {
  removeFromWatchlist(id)
  showToast('已移除', 'info')
}

function getNextEpNumber(item) {
  const watched = item.watchedEpisodes
  if (watched && watched.length > 0) {
    return Math.max(...watched) + 1
  }
  return 1
}

function incrementProgress(item) {
  const nextEp = incrementWatchlistProgress(item.subject.id)
  if (nextEp !== null) {
    showToast(`《${getTitle(item.subject)}》进度已更新至第 ${nextEp} 集！🎉`, 'success')
  }
}
</script>

<style scoped>
.mybangumi-title {
  font-size: 1.8rem;
  font-weight: 900;
  text-align: center;
  margin-bottom: 28px;
  background: linear-gradient(135deg, var(--bili-pink), var(--bili-blue));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}

.watchlist {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.status-select {
  padding: 5px 10px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-size: 0.8rem;
  cursor: pointer;
  font-family: inherit;
}

.status-select:focus {
  border-color: var(--bili-pink);
  outline: none;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .watchlist-card {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .watchlist-card__actions {
    justify-content: center;
  }
}
</style>
