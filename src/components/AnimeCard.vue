<template>
  <router-link :to="{ name: 'Detail', params: { id: subject.id } }" class="anime-card">
    <div class="anime-card__cover">
      <img
        :src="coverUrl"
        :alt="displayName"
        loading="lazy"
        @error="handleImgError"
      />
      <div class="anime-card__overlay">
        <div v-if="rating" class="anime-card__rating">
          <span class="star">★</span>
          {{ formattedRating }}
        </div>
        <div v-if="epsCount" class="anime-card__eps">
          {{ epsCount }}话
        </div>
      </div>
    </div>
    <div class="anime-card__info">
      <div class="anime-card__title">{{ displayName }}</div>
      <div v-if="subtitle" class="anime-card__subtitle">{{ subtitle }}</div>
    </div>
  </router-link>
</template>

<script setup>
import { computed } from 'vue'
import { getLargeImage, formatRating } from '../api/bangumi'

const props = defineProps({
  subject: {
    type: Object,
    required: true
  }
})

const displayName = computed(() => {
  return props.subject.name_cn || props.subject.name || '未知名称'
})

const subtitle = computed(() => {
  if (props.subject.name_cn && props.subject.name) {
    return props.subject.name
  }
  return props.subject.air_date || props.subject.date || ''
})

const coverUrl = computed(() => {
  return getLargeImage(props.subject.images)
})

const rating = computed(() => {
  return props.subject.rating?.score || null
})

const formattedRating = computed(() => {
  return formatRating(rating.value)
})

const epsCount = computed(() => {
  return props.subject.eps_count || props.subject.eps || props.subject.total_episodes || null
})

function handleImgError(e) {
  e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI4MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI4MCIgZmlsbD0iI2U1ZTVlNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5IiBmb250LXNpemU9IjE0Ij7ml6Dlm77niYc8L3RleHQ+PC9zdmc+'
}
</script>
