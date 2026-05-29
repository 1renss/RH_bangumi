<template>
  <div class="loading-container">
    <div class="spinner"></div>
    <span class="loading-text">{{ text }}</span>
  </div>
</template>

<script setup>
defineProps({
  text: { type: String, default: '加载中...' }
})
</script>
