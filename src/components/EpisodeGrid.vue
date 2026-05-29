<template>
  <div class="episode-grid-wrapper">
    <!-- 模式切换 -->
    <div class="episode-grid-controls">
      <div class="mode-switch">
        <span>自由选择</span>
        <div
          :class="['mode-switch__toggle', { 'mode-switch__toggle--active': continuousMode }]"
          @click="continuousMode = !continuousMode"
        ></div>
        <span>连续模式</span>
      </div>
      <div class="episode-grid-stats">
        已看 <strong>{{ watchedCount }}</strong> / {{ totalCount }} 话
      </div>
    </div>

    <!-- 集数网格 -->
    <div class="episode-grid">
      <button
        v-for="ep in episodes"
        :key="ep.sort"
        :class="[
          'episode-btn',
          {
            'episode-btn--watched': isWatched(ep.sort),
            'episode-btn--current': currentEpisode === ep.sort
          }
        ]"
        @click="handleEpisodeClick(ep.sort)"
        :title="getEpisodeTitle(ep)"
      >
        {{ ep.sort }}
      </button>
    </div>

    <!-- 快捷操作 -->
    <div class="episode-grid-actions" v-if="episodes.length > 0">
      <button class="btn btn-sm btn-secondary" @click="markAllWatched">
        ✅ 全部标记
      </button>
      <button class="btn btn-sm btn-secondary" @click="clearAll">
        🗑️ 清除全部
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import {
  isEpisodeWatched, getWatchedEpisodes, setWatchedEpisodes, useWatchlist
} from '../stores/watchlist'

const props = defineProps({
  subjectId: { type: [Number, String], required: true },
  episodes: { type: Array, default: () => [] }
})

const emit = defineEmits(['update'])

const continuousMode = ref(true)
const currentEpisode = ref(null)
const watchlist = useWatchlist()

const watchedCount = computed(() => {
  if (watchlist[props.subjectId]?.status === 'completed') {
    return props.episodes.length
  }
  return getWatchedEpisodes(props.subjectId).length
})

const totalCount = computed(() => {
  return props.episodes.length
})

function isWatched(sort) {
  return isEpisodeWatched(props.subjectId, sort)
}

function handleEpisodeClick(sort) {
  currentEpisode.value = sort

  if (continuousMode.value) {
    let watchedEps = []
    if (watchlist[props.subjectId]?.status === 'completed') {
      watchedEps = props.episodes.map(e => e.sort)
    } else {
      watchedEps = getWatchedEpisodes(props.subjectId)
    }
    const maxWatched = watchedEps.length > 0 ? Math.max(...watchedEps) : 0

    if (isWatched(sort)) {
      if (sort === maxWatched) {
        // 如果点击的是当前最大已看集数，则退回一集（取消当前集及以上）
        const watched = props.episodes.filter(e => e.sort < sort).map(e => e.sort)
        setWatchedEpisodes(props.subjectId, watched)
      } else {
        // 如果点击的是已看集中间的某集，则将进度调整到刚好这集
        const watched = props.episodes.filter(e => e.sort <= sort).map(e => e.sort)
        setWatchedEpisodes(props.subjectId, watched)
      }
    } else {
      // 如果未看，标记到这一集
      const watched = props.episodes.filter(e => e.sort <= sort).map(e => e.sort)
      setWatchedEpisodes(props.subjectId, watched)
    }
  } else {
    // 自由模式
    if (watchlist[props.subjectId]?.status === 'completed') {
      const watched = props.episodes.filter(e => e.sort !== sort).map(e => e.sort)
      setWatchedEpisodes(props.subjectId, watched)
    } else {
      const watched = [...getWatchedEpisodes(props.subjectId)]
      const index = watched.indexOf(sort)
      if (index > -1) {
        watched.splice(index, 1)
      } else {
        watched.push(sort)
      }
      setWatchedEpisodes(props.subjectId, watched)
    }
  }

  emit('update')
}

function getEpisodeTitle(ep) {
  const name = ep.name_cn || ep.name || ''
  const status = isWatched(ep.sort) ? '✅ 已看' : '未看'
  return `第${ep.sort}话 ${name} - ${status}`
}

function markAllWatched() {
  if (props.episodes.length > 0) {
    const watched = props.episodes.map(e => e.sort)
    setWatchedEpisodes(props.subjectId, watched)
    emit('update')
  }
}

function clearAll() {
  if (props.episodes.length > 0) {
    setWatchedEpisodes(props.subjectId, [])
    emit('update')
  }
}
</script>

<style scoped>
.episode-grid-wrapper {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.episode-grid-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.episode-grid-stats {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.episode-grid-stats strong {
  color: var(--bili-pink);
  font-weight: 700;
}

.episode-grid-actions {
  display: flex;
  gap: 8px;
  padding-top: 8px;
}
</style>
