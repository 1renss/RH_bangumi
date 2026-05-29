<template>
  <div class="page-container with-padding-top">
    <!-- 欢迎 Banner -->
    <div class="home-banner animate-fadeInUp">
      <div class="home-banner__content">
        <h1 class="home-banner__title">📺 RH番剧记录系统</h1>
        <p class="home-banner__subtitle">追踪你的每一部番剧，记录每一份感动</p>
        <router-link to="/search" class="btn btn-primary btn-lg" id="home-explore-btn">
          🔍 探索番剧
        </router-link>
      </div>
      <div class="home-banner__decoration">
        <div class="home-banner__circle home-banner__circle--1"></div>
        <div class="home-banner__circle home-banner__circle--2"></div>
        <div class="home-banner__circle home-banner__circle--3"></div>
      </div>
    </div>

    <!-- 每日放送 -->
    <section class="section animate-fadeInUp" style="animation-delay: 0.1s;">
      <div class="section__header">
        <h2 class="section__title">每日放送</h2>
        <span class="section__more">{{ todayText }}</span>
      </div>

      <!-- 星期 Tab -->
      <div class="tabs" style="margin-bottom: 20px;">
        <div
          v-for="day in weekdays"
          :key="day.id"
          :class="['tab', { 'tab--active': selectedDay === day.id }]"
          @click="selectedDay = day.id"
        >
          {{ day.cn }}
          <span v-if="day.id === todayId" style="font-size: 0.7rem; margin-left: 2px;">今</span>
        </div>
      </div>

      <!-- 加载中 -->
      <LoadingSpinner v-if="calendarLoading" text="正在获取每日放送..." />

      <!-- 错误状态 -->
      <div v-else-if="calendarError" class="empty-state">
        <div class="empty-state__icon">😵</div>
        <div class="empty-state__title">加载失败</div>
        <div class="empty-state__desc">{{ calendarError }}</div>
        <button class="btn btn-primary" style="margin-top: 16px;" @click="loadCalendar">
          重新加载
        </button>
      </div>

      <!-- 番剧列表 -->
      <div v-else class="card-grid">
        <AnimeCard
          v-for="item in currentDayAnime"
          :key="item.id"
          :subject="item"
        />
      </div>

      <!-- 空状态 -->
      <div v-if="!calendarLoading && !calendarError && currentDayAnime.length === 0" class="empty-state">
        <div class="empty-state__icon">📭</div>
        <div class="empty-state__title">今天没有放送</div>
        <div class="empty-state__desc">换个日期看看吧</div>
      </div>
    </section>

    <!-- 快速入口 -->
    <section class="section animate-fadeInUp" style="animation-delay: 0.2s;">
      <div class="section__header">
        <h2 class="section__title">快速入口</h2>
      </div>
      <div class="quick-links">
        <router-link to="/search" class="quick-link-card">
          <span class="quick-link-card__icon">🔍</span>
          <span class="quick-link-card__label">搜索番剧</span>
          <span class="quick-link-card__desc">关键词 & 年份筛选</span>
        </router-link>
        <router-link to="/my-bangumi" class="quick-link-card">
          <span class="quick-link-card__icon">❤️</span>
          <span class="quick-link-card__label">我的看番</span>
          <span class="quick-link-card__desc">追番 & 进度管理</span>
        </router-link>
        <router-link to="/search?q=2025" class="quick-link-card">
          <span class="quick-link-card__icon">🌟</span>
          <span class="quick-link-card__label">新番推荐</span>
          <span class="quick-link-card__desc">探索最新番剧</span>
        </router-link>
        <div class="quick-link-card" @click="showSettingsModal = true" style="cursor: pointer;">
          <span class="quick-link-card__icon">⚙️</span>
          <span class="quick-link-card__label">API 设置</span>
          <span class="quick-link-card__desc">配置 Bangumi API Token</span>
        </div>
      </div>
    </section>

    <!-- 设置区域 -->
    <section class="section animate-fadeInUp" style="animation-delay: 0.3s;">
      <div class="section__header">
        <h2 class="section__title">设置</h2>
      </div>
      <div class="settings-card">
        <div class="settings-item" @click="showSettingsModal = true">
          <div class="settings-item__left">
            <span class="settings-item__icon">🔑</span>
            <div class="settings-item__info">
              <span class="settings-item__label">API Token</span>
              <span class="settings-item__desc">
                {{ isDefaultToken ? '使用默认 Token' : '已配置自定义 Token' }}
              </span>
            </div>
          </div>
          <span class="settings-item__arrow">→</span>
        </div>
        <div class="settings-item" style="cursor: default;">
          <div class="settings-item__left">
            <span class="settings-item__icon">📡</span>
            <div class="settings-item__info">
              <span class="settings-item__label">API 状态</span>
              <span class="settings-item__desc">
                {{ apiStatusText }}
              </span>
            </div>
          </div>
          <span :class="['settings-item__status', apiStatusClass]">{{ apiStatusDot }}</span>
        </div>
      </div>
    </section>

    <!-- 设置弹窗 -->
    <div v-if="showSettingsModal" class="modal-overlay" @click.self="showSettingsModal = false">
      <div class="modal animate-fadeInUp">
        <div class="modal__header">
          <h3 class="modal__title">⚙️ API 设置</h3>
          <button class="modal__close" @click="showSettingsModal = false">✕</button>
        </div>

        <div class="modal__body">
          <div class="form-group">
            <label class="form-label">Bangumi API Token</label>
            <p class="form-hint">
              用于访问番剧详情和集数等 API。可在
              <a href="https://next.bgm.tv/demo/access-token" target="_blank" class="form-link">Bangumi 官网</a>
              生成 Token。
            </p>
            <div class="form-input-group">
              <input
                v-model="editToken"
                :type="showToken ? 'text' : 'password'"
                class="form-input"
                placeholder="输入你的 API Token..."
                id="settings-api-token"
              />
              <button class="form-input-toggle" @click="showToken = !showToken">
                {{ showToken ? '🙈' : '👁️' }}
              </button>
            </div>
          </div>

          <div class="form-actions">
            <button class="btn btn-primary" @click="saveToken">💾 保存</button>
            <button class="btn btn-secondary" @click="resetToken">🔄 恢复默认</button>
            <button class="btn btn-secondary" @click="testApi">🧪 测试连接</button>
          </div>

          <div v-if="testResult" :class="['form-test-result', `form-test-result--${testResult.type}`]">
            {{ testResult.message }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getCalendar, getTodayWeekday, getWeekdayCN, getSubjectDetail } from '../api/bangumi'
import {
  getApiToken, setApiToken, resetApiToken, getDefaultApiToken,
  useApiSettings, showToast
} from '../stores/watchlist'
import AnimeCard from '../components/AnimeCard.vue'
import LoadingSpinner from '../components/LoadingSpinner.vue'

// Calendar
const calendarData = ref([])
const calendarLoading = ref(true)
const calendarError = ref(null)
const todayId = getTodayWeekday()
const selectedDay = ref(todayId)

const weekdays = [
  { id: 1, cn: '周一' }, { id: 2, cn: '周二' }, { id: 3, cn: '周三' },
  { id: 4, cn: '周四' }, { id: 5, cn: '周五' }, { id: 6, cn: '周六' },
  { id: 7, cn: '周日' }
]

const todayText = computed(() => `今天是${getWeekdayCN(todayId)}`)

const currentDayAnime = computed(() => {
  const dayData = calendarData.value.find(d => d.weekday?.id === selectedDay.value)
  return dayData?.items || []
})

// Settings
const apiSettings = useApiSettings()
const showSettingsModal = ref(false)
const editToken = ref(getApiToken())
const showToken = ref(false)
const testResult = ref(null)
const apiStatus = ref('unknown') // unknown | ok | error

const isDefaultToken = computed(() => {
  return apiSettings.token === getDefaultApiToken()
})

const apiStatusText = computed(() => {
  const map = { unknown: '未测试', ok: '连接正常', error: '连接异常' }
  return map[apiStatus.value]
})

const apiStatusClass = computed(() => `settings-item__status--${apiStatus.value}`)
const apiStatusDot = computed(() => {
  const map = { unknown: '⚪', ok: '🟢', error: '🔴' }
  return map[apiStatus.value]
})

function saveToken() {
  setApiToken(editToken.value)
  showToast('API Token 已保存 ✅', 'success')
  testResult.value = null
}

function resetToken() {
  resetApiToken()
  editToken.value = getDefaultApiToken()
  showToast('已恢复默认 Token', 'info')
  testResult.value = null
}

async function testApi() {
  testResult.value = { type: 'info', message: '⏳ 正在测试...' }
  // 先临时保存当前输入的 token
  const prevToken = getApiToken()
  setApiToken(editToken.value)

  try {
    const data = await getSubjectDetail(12)
    if (data && data.id) {
      testResult.value = { type: 'success', message: `✅ 连接成功！测试获取到: ${data.name_cn || data.name}` }
      apiStatus.value = 'ok'
    } else {
      testResult.value = { type: 'error', message: '❌ 返回数据异常' }
      apiStatus.value = 'error'
    }
  } catch (err) {
    testResult.value = { type: 'error', message: `❌ 连接失败: ${err.message}` }
    apiStatus.value = 'error'
    // 恢复之前的 token
    setApiToken(prevToken)
  }
}

async function loadCalendar() {
  calendarLoading.value = true
  calendarError.value = null
  try {
    calendarData.value = await getCalendar()
    apiStatus.value = 'ok'
  } catch (err) {
    calendarError.value = err.message || '网络请求失败，请检查网络连接'
    apiStatus.value = 'error'
  } finally {
    calendarLoading.value = false
  }
}

onMounted(() => {
  loadCalendar()
})
</script>

<style scoped>
.home-banner {
  position: relative;
  background: linear-gradient(135deg, #fb7299 0%, #ff9db5 40%, #00a1d6 100%);
  border-radius: var(--radius-xl);
  padding: 48px 40px;
  margin-bottom: 36px;
  overflow: hidden;
  color: white;
}

.home-banner__content {
  position: relative;
  z-index: 2;
}

.home-banner__title {
  font-size: 2.2rem;
  font-weight: 900;
  margin-bottom: 10px;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.home-banner__subtitle {
  font-size: 1rem;
  opacity: 0.9;
  margin-bottom: 24px;
}

.home-banner__decoration {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 50%;
}

.home-banner__circle {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
}

.home-banner__circle--1 {
  width: 200px;
  height: 200px;
  right: -40px;
  top: -40px;
  animation: float 6s ease-in-out infinite;
}

.home-banner__circle--2 {
  width: 140px;
  height: 140px;
  right: 80px;
  bottom: -30px;
  animation: float 8s ease-in-out infinite reverse;
}

.home-banner__circle--3 {
  width: 80px;
  height: 80px;
  right: 200px;
  top: 20px;
  animation: float 5s ease-in-out infinite 1s;
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-20px); }
}

/* Quick Links */
.quick-links {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}

.quick-link-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 28px 20px;
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  transition: all var(--transition-normal);
  text-align: center;
  border: 1px solid var(--border-light);
}

.quick-link-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-card-hover);
  border-color: var(--bili-pink);
}

.quick-link-card__icon {
  font-size: 2.2rem;
  margin-bottom: 12px;
}

.quick-link-card__label {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.quick-link-card__desc {
  font-size: 0.8rem;
  color: var(--text-tertiary);
}

@media (max-width: 768px) {
  .home-banner {
    padding: 32px 24px;
  }

  .home-banner__title {
    font-size: 1.6rem;
  }

  .quick-links {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .quick-link-card {
    padding: 20px 12px;
  }
}

/* Settings Section */
.settings-card {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  overflow: hidden;
  border: 1px solid var(--border-light);
}

.settings-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  cursor: pointer;
  transition: background var(--transition-fast);
  border-bottom: 1px solid var(--border-light);
}

.settings-item:last-child {
  border-bottom: none;
}

.settings-item:hover {
  background: var(--bg-hover);
}

.settings-item__left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.settings-item__icon {
  font-size: 1.4rem;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
}

.settings-item__info {
  display: flex;
  flex-direction: column;
}

.settings-item__label {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--text-primary);
}

.settings-item__desc {
  font-size: 0.78rem;
  color: var(--text-tertiary);
  margin-top: 2px;
}

.settings-item__arrow {
  color: var(--text-tertiary);
  font-size: 1.1rem;
}

.settings-item__status {
  font-size: 1rem;
}

/* Modal Enhancements */
.modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.modal__close {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
  font-size: 1.1rem;
  transition: all var(--transition-fast);
}

.modal__close:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.modal__body {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
}

.form-hint {
  font-size: 0.8rem;
  color: var(--text-tertiary);
  line-height: 1.5;
}

.form-link {
  color: var(--bili-blue);
  text-decoration: underline;
}

.form-link:hover {
  color: var(--bili-pink);
}

.form-input-group {
  display: flex;
  gap: 8px;
}

.form-input {
  flex: 1;
  height: 42px;
  padding: 0 14px;
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-size: 0.85rem;
  font-family: 'Consolas', 'Monaco', monospace;
  transition: border-color var(--transition-fast);
}

.form-input:focus {
  border-color: var(--bili-pink);
  background: var(--bg-secondary);
}

.form-input-toggle {
  width: 42px;
  height: 42px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  border: 2px solid var(--border-color);
  font-size: 1.1rem;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.form-input-toggle:hover {
  border-color: var(--bili-pink);
}

.form-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.form-test-result {
  padding: 12px 16px;
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  animation: fadeIn 0.3s ease;
}

.form-test-result--info {
  background: rgba(0, 161, 214, 0.1);
  color: var(--bili-blue);
  border: 1px solid rgba(0, 161, 214, 0.2);
}

.form-test-result--success {
  background: rgba(76, 175, 80, 0.1);
  color: #4caf50;
  border: 1px solid rgba(76, 175, 80, 0.2);
}

.form-test-result--error {
  background: rgba(255, 71, 87, 0.1);
  color: #ff4757;
  border: 1px solid rgba(255, 71, 87, 0.2);
}
</style>
