<template>
  <div class="rating-display">
    <div class="rating-stars">
      <span
        v-for="i in 5"
        :key="i"
        :class="[
          'rating-star',
          {
            'rating-star--filled': i <= fullStars,
            'rating-star--half': i === fullStars + 1 && hasHalf
          }
        ]"
      >★</span>
    </div>
    <span v-if="showScore" class="rating-score">{{ formattedScore }}</span>
    <span v-if="showCount && count" class="rating-count">({{ count }}人评分)</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  score: { type: Number, default: 0 },
  count: { type: Number, default: 0 },
  showScore: { type: Boolean, default: true },
  showCount: { type: Boolean, default: true }
})

const normalizedScore = computed(() => props.score / 2) // 10分制转5星

const fullStars = computed(() => Math.floor(normalizedScore.value))

const hasHalf = computed(() => normalizedScore.value - fullStars.value >= 0.3)

const formattedScore = computed(() => {
  if (!props.score) return 'N/A'
  return props.score.toFixed(1)
})
</script>
