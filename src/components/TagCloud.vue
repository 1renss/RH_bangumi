<template>
  <div class="tag-cloud">
    <span
      v-for="tag in displayTags"
      :key="tag.name"
      :class="['tag', { 'tag--active': selectedTag === tag.name }]"
      @click="$emit('select', tag.name)"
    >
      {{ tag.name }}
      <span v-if="tag.count" style="margin-left: 4px; opacity: 0.6;">{{ tag.count }}</span>
    </span>
    <button
      v-if="tags.length > maxShow && !expanded"
      class="tag"
      @click="expanded = true"
      style="cursor: pointer;"
    >
      展开更多 ↓
    </button>
    <button
      v-if="expanded && tags.length > maxShow"
      class="tag"
      @click="expanded = false"
      style="cursor: pointer;"
    >
      收起 ↑
    </button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  tags: { type: Array, default: () => [] },
  maxShow: { type: Number, default: 12 },
  selectedTag: { type: String, default: '' }
})

defineEmits(['select'])

const expanded = ref(false)

const displayTags = computed(() => {
  if (expanded.value) return props.tags
  return props.tags.slice(0, props.maxShow)
})
</script>

<style scoped>
.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
