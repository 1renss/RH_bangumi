<template>
  <div class="page-container" style="padding-top: 0;">
    <!-- 加载中 -->
    <div v-if="loading" style="padding-top: calc(var(--nav-height) + 40px);">
      <LoadingSpinner text="正在加载番剧详情..." />
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="page-container with-padding-top">
      <div class="empty-state">
        <div class="empty-state__icon">😵</div>
        <div class="empty-state__title">加载失败</div>
        <div class="empty-state__desc">{{ error }}</div>
        <button class="btn btn-primary" style="margin-top: 16px;" @click="loadDetail">重新加载</button>
      </div>
    </div>

    <!-- 详情内容 -->
    <div v-else-if="subject">
      <!-- Banner 背景 -->
      <div class="detail-banner">
        <img
          v-if="bannerImage"
          :src="bannerImage"
          class="detail-banner__bg"
          alt=""
        />
        <div class="detail-banner__gradient"></div>
      </div>

      <!-- 主要信息 -->
      <div class="detail-content" style="max-width: 1200px; margin: -180px auto 0; padding: 0 20px;">
        <div class="detail-main animate-fadeInUp">
          <!-- 封面 -->
          <div class="detail-cover">
            <img
              :src="coverImage"
              :alt="displayName"
              @error="handleImgError"
            />
          </div>

          <!-- 信息 -->
          <div class="detail-info">
            <h1 class="detail-info__title">{{ displayName }}</h1>
            <p v-if="subject.name && subject.name !== displayName" class="detail-info__title-jp">
              {{ subject.name }}
            </p>

            <!-- 评分 -->
            <RatingStars
              v-if="subject.rating"
              :score="subject.rating.score"
              :count="subject.rating.total"
            />

            <!-- Meta 信息 -->
            <div class="detail-info__meta">
              <span v-if="subject.date" class="detail-info__meta-item">📅 {{ subject.date }}</span>
              <span v-if="platform" class="detail-info__meta-item">📺 {{ platform }}</span>
              <span v-if="totalEps" class="detail-info__meta-item">🎬 {{ totalEps }}话</span>
              <span v-if="subject.rating?.rank" class="detail-info__meta-item">🏆 #{{ subject.rating.rank }}</span>
            </div>

            <!-- 操作按钮 -->
            <div class="detail-actions" style="display: flex; flex-direction: column; gap: 12px; align-items: flex-start; width: 100%;">
              <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                <div v-if="!inWatchlist" class="status-selector">
                  <button class="btn btn-primary" @click="addToList('watching')">
                    ➕ 追番
                  </button>
                  <button class="btn btn-secondary" @click="addToList('plan')">
                    📋 想看
                  </button>
                </div>
                <div v-else class="status-selector">
                  <button
                    :class="['status-btn', { 'status-btn--watching': watchStatus === 'watching' }]"
                    @click="changeStatus('watching')"
                  >在看</button>
                  <button
                    :class="['status-btn', { 'status-btn--completed': watchStatus === 'completed' }]"
                    @click="changeStatus('completed')"
                  >看完</button>
                  <button
                    :class="['status-btn', { 'status-btn--plan': watchStatus === 'plan' }]"
                    @click="changeStatus('plan')"
                  >想看</button>
                  <button
                    :class="['status-btn', { 'status-btn--dropped': watchStatus === 'dropped' }]"
                    @click="changeStatus('dropped')"
                  >弃番</button>
                  <button class="btn btn-sm btn-danger" @click="removeFromList" style="margin-left: 8px;">
                    移除
                  </button>
                </div>

                <!-- 推荐按钮 -->
                <button
                  :class="['btn', isRec ? 'btn-primary' : 'btn-secondary']"
                  @click="toggleRecommendStatus"
                >
                  {{ isRec ? '👍 已推荐' : '👍 推荐' }}
                </button>
              </div>

              <!-- 推荐理由输入框 -->
              <div v-if="isRec" class="recommend-reason-box animate-fadeInUp" style="display: flex; flex-direction: column; gap: 10px; width: 100%; max-width: 500px; padding: 12px; border-radius: var(--radius-md);">
                <div style="display: flex; align-items: center; width: 100%;">
                  <span>💬</span>
                  <input
                    v-model="recReason"
                    class="recommend-reason-input"
                    placeholder="录入推荐理由（如：作画震撼，剧情催泪，自动保存）..."
                    @blur="saveRecReason"
                    @keyup.enter="saveRecReason"
                    style="flex: 1;"
                  />
                  <span class="recommend-reason-save-tip">（失焦/回车保存）</span>
                </div>
                
                <div style="display: flex; align-items: center; gap: 8px; font-size: 0.82rem; padding-left: 20px;">
                  <span style="color: var(--text-secondary); white-space: nowrap;">📂 归类到收藏夹：</span>
                  
                  <template v-if="!showInlineCreate">
                    <select v-model="selectedFolderId" style="padding: 4px 12px; height: 30px; border-radius: 15px; border: 1px solid var(--border-color); background: var(--bg-tertiary); color: var(--text-primary); font-size: 0.8rem; cursor: pointer; outline: none;">
                      <option :value="null">未分类</option>
                      <option v-for="f in folders" :key="f.id" :value="f.id">{{ f.name }}</option>
                    </select>
                    <button class="btn btn-sm btn-secondary" @click="showInlineCreate = true" style="height: 30px; padding: 0 10px; border-radius: 15px; font-size: 0.75rem; white-space: nowrap;">
                      ➕ 新建
                    </button>
                  </template>
                  
                  <template v-else>
                    <input 
                      v-model="inlineFolderName" 
                      placeholder="新分类名称..." 
                      style="padding: 4px 12px; height: 30px; border-radius: 15px; border: 1px solid var(--bili-pink-light); background: var(--bg-tertiary); color: var(--text-primary); font-size: 0.8rem; outline: none; width: 110px;"
                      @keyup.enter="handleInlineCreateSubmit"
                      @blur="handleInlineCreateSubmit"
                      ref="inlineInput"
                    />
                    <button class="btn btn-sm btn-primary" @click="handleInlineCreateSubmit" style="height: 30px; padding: 0 8px; border-radius: 15px; font-size: 0.75rem; white-space: nowrap;">
                      确定
                    </button>
                    <button class="btn btn-sm btn-secondary" @click="showInlineCreate = false" style="height: 30px; padding: 0 8px; border-radius: 15px; font-size: 0.75rem; white-space: nowrap;" @mousedown.prevent>
                      取消
                    </button>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 简介 -->
        <section class="section animate-fadeInUp" style="animation-delay: 0.1s;" v-if="subject.summary">
          <div class="section__header">
            <h2 class="section__title">简介</h2>
          </div>
          <div class="infobox" style="margin-bottom: 0;">
            <div
              :class="['detail-info__summary', { expanded: summaryExpanded }]"
              v-html="formattedSummary"
            ></div>
            <span
              v-if="subject.summary && subject.summary.length > 150"
              class="detail-info__summary-toggle"
              @click="summaryExpanded = !summaryExpanded"
            >
              {{ summaryExpanded ? '收起 ↑' : '展开全部 ↓' }}
            </span>
          </div>
        </section>

        <!-- 标签 -->
        <section class="section animate-fadeInUp" style="animation-delay: 0.15s;" v-if="subject.tags?.length">
          <div class="section__header">
            <h2 class="section__title">标签</h2>
          </div>
          <TagCloud :tags="subject.tags" :max-show="16" @select="goToSearchWithTag" />
        </section>

        <!-- 集数列表 -->
        <section class="section animate-fadeInUp" style="animation-delay: 0.2s;" v-if="episodes.length > 0">
          <div class="section__header">
            <h2 class="section__title">集数列表</h2>
            <span class="section__more" v-if="inWatchlist">
              进度: {{ progressText }}
            </span>
          </div>

          <!-- 进度条 -->
          <div v-if="inWatchlist" class="progress-bar" style="margin-bottom: 16px;">
            <div class="progress-bar__fill" :style="{ width: progressPercent + '%' }"></div>
          </div>

          <!-- 未加入追番提示 -->
          <div v-if="!inWatchlist" class="episode-notice">
            <p>💡 加入「我的看番」后可以标记观看进度</p>
            <button class="btn btn-primary btn-sm" @click="addToList('watching')">➕ 追番</button>
          </div>

          <EpisodeGrid
            v-if="inWatchlist"
            :subjectId="subjectId"
            :episodes="mainEpisodes"
            @update="refreshProgress"
          />

          <!-- 未加入时仅展示集数名 -->
          <div v-else class="episode-list-readonly">
            <div
              v-for="ep in mainEpisodes"
              :key="ep.id"
              class="episode-list-item"
            >
              <span class="episode-list-item__num">{{ ep.sort }}</span>
              <span class="episode-list-item__name">{{ ep.name_cn || ep.name || '' }}</span>
              <span class="episode-list-item__date" v-if="ep.airdate">{{ ep.airdate }}</span>
            </div>
          </div>
        </section>

        <!-- Infobox 详细信息 -->
        <section class="section animate-fadeInUp" style="animation-delay: 0.25s;" v-if="infoboxItems.length > 0">
          <div class="section__header">
            <h2 class="section__title">详细信息</h2>
          </div>
          <div class="infobox">
            <div v-for="item in infoboxItems" :key="item.key" class="infobox__item">
              <span class="infobox__label">{{ item.key }}</span>
              <span class="infobox__value">{{ item.value }}</span>
            </div>
          </div>
        </section>

        <!-- 收藏统计 -->
        <section class="section animate-fadeInUp" style="animation-delay: 0.3s;" v-if="subject.collection">
          <div class="section__header">
            <h2 class="section__title">收藏统计</h2>
          </div>
          <div class="collection-stats">
            <div class="collection-stat">
              <span class="collection-stat__number">{{ subject.collection.wish || 0 }}</span>
              <span class="collection-stat__label">想看</span>
            </div>
            <div class="collection-stat">
              <span class="collection-stat__number">{{ subject.collection.collect || 0 }}</span>
              <span class="collection-stat__label">看过</span>
            </div>
            <div class="collection-stat">
              <span class="collection-stat__number">{{ subject.collection.doing || 0 }}</span>
              <span class="collection-stat__label">在看</span>
            </div>
            <div class="collection-stat">
              <span class="collection-stat__number">{{ subject.collection.on_hold || 0 }}</span>
              <span class="collection-stat__label">搁置</span>
            </div>
            <div class="collection-stat">
              <span class="collection-stat__number">{{ subject.collection.dropped || 0 }}</span>
              <span class="collection-stat__label">弃番</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getSubjectDetail, getEpisodes, getLargeImage, getMediumImage,
  getPlatform, getInfoboxValue
} from '../api/bangumi'
import {
  addToWatchlist, removeFromWatchlist, isInWatchlist,
  getWatchStatus, setWatchStatus, getProgressText, getProgressPercent,
  showToast, useWatchlist, useFolders, addFolder
} from '../stores/watchlist'
import RatingStars from '../components/RatingStars.vue'
import EpisodeGrid from '../components/EpisodeGrid.vue'
import TagCloud from '../components/TagCloud.vue'
import LoadingSpinner from '../components/LoadingSpinner.vue'

const route = useRoute()
const router = useRouter()

const subject = ref(null)
const episodes = ref([])
const loading = ref(true)
const error = ref(null)
const summaryExpanded = ref(false)
const refreshKey = ref(0)

const subjectId = computed(() => Number(route.params.id))

const displayName = computed(() => {
  if (!subject.value) return ''
  return subject.value.name_cn || subject.value.name || ''
})

const bannerImage = computed(() => getLargeImage(subject.value?.images))
const coverImage = computed(() => getMediumImage(subject.value?.images))

const platform = computed(() => getPlatform(subject.value))

const totalEps = computed(() => {
  return subject.value?.total_episodes || subject.value?.eps || null
})

const mainEpisodes = computed(() => {
  return episodes.value
    .filter(ep => ep.type === 0)
    .sort((a, b) => a.sort - b.sort)
})

const inWatchlist = computed(() => {
  refreshKey.value // 触发响应式刷新
  return isInWatchlist(subjectId.value)
})

const watchStatus = computed(() => {
  refreshKey.value
  return getWatchStatus(subjectId.value)
})

const progressText = computed(() => {
  refreshKey.value
  return getProgressText(subjectId.value)
})

const progressPercent = computed(() => {
  refreshKey.value
  return getProgressPercent(subjectId.value)
})

const formattedSummary = computed(() => {
  if (!subject.value?.summary) return ''
  return subject.value.summary.replace(/\r\n|\n/g, '<br>')
})

const infoboxItems = computed(() => {
  if (!subject.value?.infobox) return []
  return subject.value.infobox.map(item => {
    let value = item.value
    if (Array.isArray(value)) {
      value = value.map(v => v.v || v).join('、')
    }
    return { key: item.key, value }
  })
})

function handleImgError(e) {
  e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjIwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjIwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2U1ZTVlNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5IiBmb250LXNpemU9IjE2Ij7ml6Dlm77niYc8L3RleHQ+PC9zdmc+'
}

function addToList(status) {
  if (subject.value) {
    addToWatchlist(subject.value, status)
    refreshKey.value++
    showToast(status === 'watching' ? '已加入追番列表 ❤️' : '已标记为想看 📋', 'success')
  }
}

function changeStatus(status) {
  setWatchStatus(subjectId.value, status)
  refreshKey.value++
  const labels = { watching: '在看', completed: '已看完', plan: '想看', dropped: '已弃番' }
  showToast(`已设为「${labels[status]}」`, 'success')
}

function removeFromList() {
  removeFromWatchlist(subjectId.value)
  refreshKey.value++
  showToast('已从看番列表移除', 'info')
}

const watchlist = useWatchlist()
const recReason = ref('')
const folders = useFolders()

const isRec = computed(() => {
  refreshKey.value
  return watchlist[subjectId.value]?.recommended || false
})

const selectedFolderId = computed({
  get() {
    refreshKey.value
    return watchlist[subjectId.value]?.folderId || null
  },
  set(val) {
    if (watchlist[subjectId.value]) {
      watchlist[subjectId.value].folderId = val
      watchlist[subjectId.value].updatedAt = Date.now()
    }
  }
})

const showInlineCreate = ref(false)
const inlineFolderName = ref('')

function handleInlineCreateSubmit() {
  const name = inlineFolderName.value.trim()
  if (name) {
    const newFolder = addFolder(name)
    if (newFolder) {
      selectedFolderId.value = newFolder.id
      showToast(`已创建并选择收藏夹：${newFolder.name}`, 'success')
      refreshKey.value++
    }
  }
  showInlineCreate.value = false
  inlineFolderName.value = ''
}

watch([subject, refreshKey], () => {
  if (watchlist[subjectId.value]) {
    recReason.value = watchlist[subjectId.value].recommendationReason || ''
  } else {
    recReason.value = ''
  }
}, { immediate: true })

function toggleRecommendStatus() {
  if (!isInWatchlist(subjectId.value)) {
    addToWatchlist(subject.value, 'watching')
  }
  
  const current = watchlist[subjectId.value].recommended || false
  watchlist[subjectId.value].recommended = !current
  if (!current) {
    watchlist[subjectId.value].recommendedAt = Date.now()
  }
  watchlist[subjectId.value].updatedAt = Date.now()
  refreshKey.value++
  
  if (!current) {
    showToast('已设为“推荐” 👍，可以写下推荐理由哦！', 'success')
  } else {
    showToast('已取消推荐 👎', 'info')
  }
}

function saveRecReason() {
  if (watchlist[subjectId.value]) {
    watchlist[subjectId.value].recommendationReason = recReason.value.trim()
    watchlist[subjectId.value].updatedAt = Date.now()
    showToast('推荐理由已保存！', 'success')
  }
}

function refreshProgress() {
  refreshKey.value++
}

function goToSearchWithTag(tagName) {
  router.push({ name: 'Search', query: { q: tagName, tag: tagName } })
}

async function loadDetail() {
  loading.value = true
  error.value = null

  try {
    const [subjectData, episodesData] = await Promise.all([
      getSubjectDetail(subjectId.value),
      getEpisodes(subjectId.value).catch(() => ({ data: [] }))
    ])

    subject.value = subjectData
    episodes.value = episodesData.data || []

    // 更新页面标题
    document.title = `${displayName.value} - RH番剧记录`
  } catch (err) {
    error.value = err.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadDetail()
})

// 路由切换时重新加载
watch(() => route.params.id, (newId) => {
  if (newId) {
    loadDetail()
  }
})
</script>

<style scoped>
.episode-notice {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: rgba(251, 114, 153, 0.06);
  border: 1px dashed var(--bili-pink);
  border-radius: var(--radius-md);
  margin-bottom: 16px;
  font-size: 0.88rem;
  color: var(--text-secondary);
}

.episode-list-readonly {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 400px;
  overflow-y: auto;
}

.episode-list-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  border-radius: var(--radius-sm);
  transition: background var(--transition-fast);
}

.episode-list-item:hover {
  background: var(--bg-hover);
}

.episode-list-item__num {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.episode-list-item__name {
  flex: 1;
  font-size: 0.88rem;
  color: var(--text-primary);
}

.episode-list-item__date {
  font-size: 0.78rem;
  color: var(--text-tertiary);
}

/* Collection stats */
.collection-stats {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
}

.collection-stat {
  text-align: center;
  padding: 16px 8px;
  background: var(--bg-card);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
}

.collection-stat__number {
  display: block;
  font-size: 1.4rem;
  font-weight: 900;
  color: var(--bili-pink);
}

.collection-stat__label {
  font-size: 0.78rem;
  color: var(--text-tertiary);
  margin-top: 4px;
  display: block;
}

@media (max-width: 768px) {
  .collection-stats {
    grid-template-columns: repeat(3, 1fr);
  }

  .episode-notice {
    flex-direction: column;
    text-align: center;
  }
}
</style>
