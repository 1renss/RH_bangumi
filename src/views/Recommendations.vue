<template>
  <div class="page-container with-padding-top">
    <!-- 全屏加载遮罩层 (用于导入分享编码时的 API 轮询) -->
    <div v-if="isLoading" class="loading-overlay" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); display: flex; flex-direction: column; justify-content: center; align-items: center; z-index: 9999; color: white;">
      <LoadingSpinner text="正在解析番剧并下载详情，请稍候..." />
    </div>

    <div class="recommendations-header-section animate-fadeInUp" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; gap: 16px; flex-wrap: wrap;">
      <h1 class="recommend-title" style="margin-bottom: 0; text-align: left;">✨ 荐番墙</h1>
      
      <!-- 视图与排序切换 -->
      <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
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
            :class="['view-toggle-btn', { 'view-toggle-btn--active': viewMode === 'grid' }]"
            @click="viewMode = 'grid'"
            title="卡片网格"
          >
            🎴 网格
          </button>
          <button
            :class="['view-toggle-btn', { 'view-toggle-btn--active': viewMode === 'table' }]"
            @click="viewMode = 'table'"
            title="时间轴表"
          >
            📊 番图表
          </button>
        </div>

        <!-- 截图按钮 -->
        <button 
          v-if="recommendedList.length > 0"
          class="btn btn-primary" 
          @click="exportImage" 
          :disabled="exportingType !== null"
          style="min-width: 120px; height: 38px; padding: 0 16px; font-size: 0.85rem; border-radius: 19px;"
        >
          <span v-if="exportingType === 'image'">⏳ 正在生成...</span>
          <span v-else>📷 截图分享（待优化）</span>
        </button>
      </div>
    </div>

    <!-- 荐番墙双栏布局 -->
    <div class="recommendations-layout">
      
      <!-- 左侧收藏夹侧边栏 (no-export) -->
      <div class="folder-sidebar no-export animate-fadeInUp" style="animation-delay: 0.05s;">
        <div class="folder-sidebar__title">
          <span>📂 我的收藏夹</span>
        </div>
        <ul class="folder-list">
          <!-- 全部 -->
          <li 
            :class="['folder-item', { 'folder-item--active': activeFolderId === 'all', 'folder-item--dragover': dragOverFolderId === 'all' }]"
            @click="activeFolderId = 'all'"
            @dragover.prevent
            @dragenter="dragOverFolderId = 'all'"
            @dragleave="dragOverFolderId = null"
            @drop="onDrop($event, 'all')"
          >
            <span class="folder-item__name">🌟 全部荐番</span>
            <span class="folder-item__count">{{ getFolderCount('all') }}</span>
          </li>
          
          <!-- 未分类 -->
          <li 
            :class="['folder-item', { 'folder-item--active': activeFolderId === 'unclassified', 'folder-item--dragover': dragOverFolderId === 'unclassified' }]"
            @click="activeFolderId = 'unclassified'"
            @dragover.prevent
            @dragenter="dragOverFolderId = 'unclassified'"
            @dragleave="dragOverFolderId = null"
            @drop="onDrop($event, 'unclassified')"
          >
            <span class="folder-item__name">📥 未分类</span>
            <span class="folder-item__count">{{ getFolderCount('unclassified') }}</span>
          </li>

          <!-- 自定义收藏夹 -->
          <li 
            v-for="folder in folders" 
            :key="folder.id"
            :class="['folder-item', { 'folder-item--active': activeFolderId === folder.id, 'folder-item--dragover': dragOverFolderId === folder.id }]"
            @click="activeFolderId = folder.id"
            @dragover.prevent
            @dragenter="dragOverFolderId = folder.id"
            @dragleave="dragOverFolderId = null"
            @drop="onDrop($event, folder.id)"
          >
            <span class="folder-item__name">📁 {{ folder.name }}</span>
            <span class="folder-item__count">{{ getFolderCount(folder.id) }}</span>
            <div class="folder-item__actions">
              <button class="folder-action-btn" @click.stop="renameFolderPrompt(folder)" title="重命名">✏️</button>
              <button class="folder-action-btn" @click.stop="deleteFolderConfirm(folder)" title="删除">🗑️</button>
            </div>
          </li>
        </ul>
        <button class="btn btn-secondary btn-add-folder" @click="createNewFolder">
          ➕ 新建收藏夹
        </button>
      </div>

      <!-- 右侧主展示区 (可被 html2canvas 捕捉) -->
      <div id="recommendations-share-area" :class="{ 'is-exporting': exportingType !== null }" style="flex: 1; min-width: 0;">
        
        <!-- 仅在导出分享时显示的精美页眉 -->
        <div class="share-header">
          <div class="share-header__logo">📺 RH番剧记录系统</div>
          <div class="share-header__title">✨ 我的荐番墙 · {{ activeFolderName }}</div>
          <div class="share-header__subtitle">我精选推荐了 {{ recommendedList.length }} 部超赞的番剧，附带我的个人推荐语！</div>
        </div>

        <!-- 列表/时间轴展现 -->
        <template v-if="recommendedList.length > 0">
          
          <!-- 1. 网格模式 -->
          <div v-if="viewMode === 'grid'" class="rec-grid">
            <div 
              v-for="item in recommendedList" 
              :key="item.subject.id" 
              class="rec-card animate-fadeInUp"
              draggable="true"
              @dragstart="onDragStart($event, item.subject.id)"
            >
              <!-- 封面图 -->
              <router-link :to="{ name: 'Detail', params: { id: item.subject.id } }" class="rec-card__cover-link no-export-target-link">
                <img :src="getCover(item.subject)" :alt="getTitle(item.subject)" @error="handleImgError" crossorigin="anonymous" />
                <div class="rec-card__cover-overlay">
                  <span v-if="item.subject.rating?.score">★ {{ item.subject.rating.score }}</span>
                  <span v-if="item.subject.eps_count">{{ item.subject.eps_count }}话</span>
                </div>
              </router-link>

              <!-- 卡片内容 -->
              <div class="rec-card__info">
                <div class="rec-card__header">
                  <div v-if="exportingType !== null" class="rec-card__title" style="font-weight: 700;">
                    {{ getTitle(item.subject) }}
                  </div>
                  <router-link v-else :to="{ name: 'Detail', params: { id: item.subject.id } }" class="rec-card__title">
                    {{ getTitle(item.subject) }}
                  </router-link>
                  
                  <div class="rec-card__meta" style="display: flex; justify-content: space-between; align-items: center;">
                    <span>📅 {{ getYear(item.subject) }}</span>
                    <!-- 移动/归类选择框 -->
                    <select 
                      :value="item.folderId || ''" 
                      @change="moveAnimeToFolder(item.subject.id, $event.target.value || null)" 
                      class="no-export" 
                      style="font-size: 0.72rem; padding: 2px 6px; border-radius: 10px; border: 1px solid var(--border-color); background: var(--bg-tertiary); color: var(--text-secondary); outline: none; cursor: pointer;"
                    >
                      <option value="">未分类</option>
                      <option v-for="f in folders" :key="f.id" :value="f.id">{{ f.name }}</option>
                    </select>
                  </div>
                </div>

                <!-- 推荐语内容 / 编辑状态 -->
                <div class="rec-card__reason-container">
                  <div v-if="editingId !== item.subject.id">
                    <div v-if="item.recommendationReason" class="rec-card__reason-bubble">
                      {{ item.recommendationReason }}
                    </div>
                    <div v-else class="rec-card__reason-bubble-empty">
                      ✍️ 暂无推荐理由，点击下方“编辑”录入吧~
                    </div>
                  </div>
                  
                  <div v-else class="rec-card__reason-edit">
                    <textarea
                      v-model="editingReason"
                      class="rec-card__reason-input"
                      rows="2"
                      placeholder="写下你的推荐理由（如：作画震撼，催泪神作）..."
                    ></textarea>
                    <div class="rec-card__edit-actions">
                      <button class="btn btn-sm btn-secondary" @click="cancelEdit">取消</button>
                      <button class="btn btn-sm btn-primary" @click="saveEdit(item.subject.id)">保存</button>
                    </div>
                  </div>
                </div>

                <!-- 卡片页脚 -->
                <div class="rec-card__footer no-export" v-if="editingId !== item.subject.id">
                  <span class="badge badge--success" style="font-size: 0.7rem;">👍 已推荐</span>
                  <div class="rec-card__actions">
                    <button class="btn btn-sm btn-secondary" @click="startEdit(item)">
                      ✏️ 编辑理由
                    </button>
                    <button class="btn btn-sm btn-danger" @click="cancelRecommend(item.subject.id)" title="取消推荐">
                      ✕ 撤销
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 2. 番图表时间轴模式 -->
          <div v-else class="timeline-wrapper" style="position: relative; padding-left: 56px;">
            <div class="timeline-axis"></div>

            <div class="timeline-year-group" v-for="yearGroup in groupedRecommendations" :key="yearGroup.name">
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
                    <div 
                      class="timeline-grid-item" 
                      v-for="item in monthGroup.items" 
                      :key="item.subject.id"
                      draggable="true"
                      @dragstart="onDragStart($event, item.subject.id)"
                    >
                      <div class="timeline-card">
                        <!-- 封面 -->
                        <div class="timeline-card__cover">
                          <img :src="getCover(item.subject)" @error="handleImgError" crossorigin="anonymous" />
                          <div class="timeline-card__overlay">
                            <span v-if="item.subject.rating?.score" class="timeline-card__rating">★ {{ item.subject.rating.score }}</span>
                            <span v-if="item.subject.eps_count" class="timeline-card__eps">{{ item.subject.eps_count }}话</span>
                          </div>
                        </div>
                        
                        <!-- 信息 -->
                        <div class="timeline-card__info" style="padding: 12px; display: flex; flex-direction: column; gap: 8px;">
                          <div>
                            <div v-if="exportingType !== null" class="timeline-card__title" style="font-weight: 700;">
                              {{ getTitle(item.subject) }}
                            </div>
                            <router-link v-else :to="{ name: 'Detail', params: { id: item.subject.id } }" class="timeline-card__title">
                              {{ getTitle(item.subject) }}
                            </router-link>
                            
                            <!-- 移动分类及基本信息 -->
                            <div class="no-export" style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
                              <span style="font-size: 0.72rem; color: var(--text-tertiary);">📅 {{ item.subject.air_date || '未知' }}</span>
                              <select 
                                :value="item.folderId || ''" 
                                @change="moveAnimeToFolder(item.subject.id, $event.target.value || null)" 
                                style="font-size: 0.72rem; padding: 2px 6px; border-radius: 10px; border: 1px solid var(--border-color); background: var(--bg-tertiary); color: var(--text-secondary); outline: none; cursor: pointer;"
                              >
                                <option value="">未分类</option>
                                <option v-for="f in folders" :key="f.id" :value="f.id">{{ f.name }}</option>
                              </select>
                            </div>
                          </div>

                          <!-- 推荐语气泡 -->
                          <div class="rec-card__reason-container" style="flex: 1; margin: 4px 0;">
                            <div v-if="editingId !== item.subject.id">
                              <div v-if="item.recommendationReason" class="rec-card__reason-bubble" style="font-size: 0.78rem; padding: 6px 10px;">
                                {{ item.recommendationReason }}
                              </div>
                              <div v-else class="rec-card__reason-bubble-empty" style="font-size: 0.78rem; padding: 6px 10px;">
                                ✍️ 暂无推荐语
                              </div>
                            </div>
                            <div v-else class="rec-card__reason-edit">
                              <textarea
                                v-model="editingReason"
                                class="rec-card__reason-input"
                                rows="2"
                                style="font-size: 0.75rem;"
                                placeholder="写下你的推荐理由..."
                              ></textarea>
                              <div class="rec-card__edit-actions">
                                <button class="btn btn-sm btn-secondary" @click="cancelEdit">取消</button>
                                <button class="btn btn-sm btn-primary" @click="saveEdit(item.subject.id)">保存</button>
                              </div>
                            </div>
                          </div>

                          <!-- 编辑与删除操作 -->
                          <div class="no-export" v-if="editingId !== item.subject.id" style="display: flex; gap: 6px; justify-content: flex-end;">
                            <button class="btn btn-sm btn-secondary" @click="startEdit(item)" style="padding: 2px 8px; font-size: 0.72rem;">
                              ✏️ 编辑
                            </button>
                            <button class="btn btn-sm btn-danger" @click="cancelRecommend(item.subject.id)" style="padding: 2px 8px; font-size: 0.72rem;">
                              ✕ 撤销
                            </button>
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
        <div v-else class="empty-state animate-fadeInUp" style="animation-delay: 0.1s;">
          <div class="empty-state__icon">📪</div>
          <div class="empty-state__title">该分类下没有推荐番剧</div>
          <div class="empty-state__desc">
            你可以在番剧详情页中点击「👍 推荐」并写下推荐语，或者拖拽其他分类的番剧到这里！
          </div>
          <router-link to="/search" class="btn btn-primary" style="margin-top: 16px;">
            🔍 去搜索并推荐番剧
          </router-link>
        </div>

        <!-- 仅在导出分享时显示的页脚 -->
        <div class="share-footer">
          <p>由「RH番剧记录系统」自动生成 · 每一份看番感动，都值得被温柔记录</p>
        </div>
      </div>
    </div>

    <!-- 荐番数据管理控制面板 (no-export) -->
    <div class="data-management-card no-export animate-fadeInUp" style="animation-delay: 0.1s;">
      <h2 style="font-size: 1.1rem; font-weight: 800; margin-top: 0; margin-bottom: 6px; display: flex; align-items: center; gap: 8px;">
        💾 荐番数据管理
      </h2>
      <p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0; margin-bottom: 20px;">
        支持导入或导出当前推荐墙的内容。其中，分享编码（最长 150 字符）专为便携分享设计，仅存储最新的至多 24 部番剧 ID，不保存推荐语。
      </p>

      <div class="data-management-grid">
        <!-- JSON 数据备份与还原 -->
        <div class="data-management-box">
          <h3>📂 JSON 数据备份/导入</h3>
          <p>保存全部推荐内容、收藏夹及推荐理由。适合个人完整备份与多端还原。</p>
          <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            <button class="btn btn-primary" @click="exportJSON" style="height: 34px; border-radius: 17px; font-size: 0.8rem;">
              💾 导出 JSON 文件
            </button>
            <label class="btn btn-secondary" style="height: 34px; border-radius: 17px; font-size: 0.8rem; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; margin-bottom: 0;">
              📥 导入 JSON 文件
              <input type="file" accept=".json" @change="importJSON" style="display: none;" />
            </label>
          </div>
        </div>

        <!-- 分享编码便携共享 -->
        <div class="data-management-box">
          <h3>📋 分享编码 (150字符)</h3>
          <p>将当前分类（或全部）下最新番剧以精简编码导出。导入时支持自动创建对应收藏夹并联网补全信息。</p>
          <div class="share-code-input-group">
            <button class="btn btn-primary" @click="exportShareCode" style="height: 34px; border-radius: 17px; font-size: 0.8rem; white-space: nowrap;">
              📋 复制分享编码
            </button>
            <input 
              v-model="importingCode" 
              class="share-code-input" 
              placeholder="粘贴分享编码到这里..." 
              @keyup.enter="importShareCode"
            />
            <button class="btn btn-secondary" @click="importShareCode" style="height: 34px; border-radius: 17px; font-size: 0.8rem; white-space: nowrap;">
              导入
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 自定义精致弹窗 (替代 prompt 和 confirm) -->
    <div v-if="showFolderModal" class="custom-modal-backdrop no-export" @click.self="closeFolderModal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); display: flex; justify-content: center; align-items: center; z-index: 9999; backdrop-filter: blur(4px);">
      <div class="custom-modal-card animate-fadeInUp" style="background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border-light); width: 100%; max-width: 400px; padding: 24px; box-shadow: var(--shadow-lg); text-align: left;">
        <h3 style="margin-top: 0; margin-bottom: 16px; font-size: 1.15rem; font-weight: 800; display: flex; align-items: center; gap: 8px;">
          <span v-if="folderModalType === 'create'">➕ 新建收藏夹</span>
          <span v-else-if="folderModalType === 'rename'">✏️ 重命名收藏夹</span>
          <span v-else-if="folderModalType === 'delete'">⚠️ 删除确认</span>
          <span v-else-if="folderModalType === 'confirm_cancel'">💥 取消推荐确认</span>
        </h3>
        
        <!-- 输入框（新建/重命名） -->
        <div v-if="folderModalType === 'create' || folderModalType === 'rename'" style="margin-bottom: 20px;">
          <label style="font-size: 0.82rem; color: var(--text-secondary); display: block; margin-bottom: 6px;">收藏夹名称</label>
          <input 
            v-model="folderModalName" 
            class="share-code-input" 
            placeholder="请输入收藏夹名称（如：日常、治愈）..." 
            style="width: 100%; height: 38px;"
            @keyup.enter="submitFolderModal"
            autofocus
          />
        </div>

        <!-- 提示文本（删除） -->
        <div v-else-if="folderModalType === 'delete'" style="margin-bottom: 20px; font-size: 0.88rem; color: var(--text-secondary); line-height: 1.5;">
          确定要删除收藏夹 <strong style="color: var(--text-primary);">[{{ folderModalTarget?.name }}]</strong> 吗？
          <p style="margin-top: 8px; margin-bottom: 0; font-size: 0.8rem; color: var(--bili-pink);">💡 提示：删除后其中的番剧将归为“未分类”，不会被移除。</p>
        </div>

        <!-- 提示文本（取消推荐） -->
        <div v-else-if="folderModalType === 'confirm_cancel'" style="margin-bottom: 20px; font-size: 0.88rem; color: var(--text-secondary); line-height: 1.5;">
          确定要将此番剧从您的荐番墙中移出吗？
        </div>

        <!-- 底部按钮 -->
        <div style="display: flex; justify-content: flex-end; gap: 10px;">
          <button class="btn btn-secondary" @click="closeFolderModal" style="height: 36px; padding: 0 16px; border-radius: 18px; font-size: 0.82rem;">
            取消
          </button>
          <button class="btn btn-primary" @click="submitFolderModal" style="height: 36px; padding: 0 16px; border-radius: 18px; font-size: 0.82rem;">
            确定
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch } from 'vue'
import { 
  useWatchlist, showToast, getTheme, 
  useFolders, addFolder, renameFolder, deleteFolder, moveAnimeToFolder 
} from '../stores/watchlist'
import { getLargeImage, getSubjectDetail } from '../api/bangumi'
import LoadingSpinner from '../components/LoadingSpinner.vue'

const watchlist = useWatchlist()
const folders = useFolders()

// 视图与分类过滤
const activeFolderId = ref(localStorage.getItem('bangumi_rec_active_folder') || 'all')
watch(activeFolderId, (val) => localStorage.setItem('bangumi_rec_active_folder', val))

const viewMode = ref(localStorage.getItem('bangumi_rec_view_mode') || 'grid')
watch(viewMode, (val) => localStorage.setItem('bangumi_rec_view_mode', val))

const sortOrder = ref(localStorage.getItem('bangumi_rec_sort_order') || 'desc')
watch(sortOrder, (val) => localStorage.setItem('bangumi_rec_sort_order', val))

const editingId = ref(null)
const editingReason = ref('')
const exportingType = ref(null)
const importingCode = ref('')
const isLoading = ref(false)

// Custom Modal setup
const showFolderModal = ref(false)
const folderModalType = ref('create') // 'create' | 'rename' | 'delete' | 'confirm_cancel'
const folderModalName = ref('')
const folderModalTarget = ref(null)

// Drag & Drop
const dragOverFolderId = ref(null)

// 过滤出推荐列表
const recommendedList = computed(() => {
  let list = Object.values(watchlist).filter(item => item.recommended === true)
  if (activeFolderId.value === 'unclassified') {
    list = list.filter(item => !item.folderId)
  } else if (activeFolderId.value !== 'all') {
    list = list.filter(item => item.folderId === activeFolderId.value)
  }
  // 默认排序：推荐时间倒序
  return list.sort((a, b) => (b.recommendedAt || 0) - (a.recommendedAt || 0))
})

// 时间表分组 computed
const groupedRecommendations = computed(() => {
  const groups = {}
  const items = [...recommendedList.value]
  
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
      // 排序月份内的番剧首播日期
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

const activeFolderName = computed(() => {
  if (activeFolderId.value === 'all') return '全部荐番'
  if (activeFolderId.value === 'unclassified') return '未分类'
  const folder = folders.value.find(f => f.id === activeFolderId.value)
  return folder ? folder.name : '未知分类'
})

function getFolderCount(folderId) {
  const allRec = Object.values(watchlist).filter(item => item.recommended === true)
  if (folderId === 'all') return allRec.length
  if (folderId === 'unclassified') return allRec.filter(item => !item.folderId).length
  return allRec.filter(item => item.folderId === folderId).length
}

// 基础文本/封面方法
function getTitle(subject) {
  return subject.name_cn || subject.name || '未知'
}

function getCover(subject) {
  const url = getLargeImage(subject.images)
  if (!url) return ''
  if (url.startsWith('https://lain.bgm.tv')) {
    return url.replace('https://lain.bgm.tv', '/img-proxy')
  }
  return url
}

function getYear(subject) {
  const date = subject.air_date || ''
  return date ? date.substring(0, 4) + '年' : '未知年份'
}

function handleImgError(e) {
  e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iMTEwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSI4MCIgaGVpZ2h0PSIxMTAiIGZpbGw9IiNlNWU1ZTUiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzk5OSIgZm9udC1zaXplPSIxMCI+5peg5Zu+54mHPC90ZXh0Pjwvc3ZnPg=='
}

// 拖放逻辑
function onDragStart(e, subjectId) {
  e.dataTransfer.setData('text/plain', subjectId.toString())
  e.dataTransfer.effectAllowed = 'move'
}

function onDrop(e, folderId) {
  e.preventDefault()
  dragOverFolderId.value = null
  const subjectId = Number(e.dataTransfer.getData('text/plain'))
  if (!subjectId) return
  
  let targetFolderId = null
  if (folderId !== 'all' && folderId !== 'unclassified') {
    targetFolderId = folderId
  }
  
  moveAnimeToFolder(subjectId, targetFolderId)
  
  const targetName = folderId === 'all' ? '全部荐番' : (folderId === 'unclassified' ? '未分类' : (folders.value.find(f => f.id === folderId)?.name || ''))
  showToast(`已移动到 [${targetName || '未分类'}]！`, 'success')
}

// 收藏夹增删改
// 收藏夹增删改 (使用自定义弹窗)
function createNewFolder() {
  folderModalType.value = 'create'
  folderModalName.value = ''
  folderModalTarget.value = null
  showFolderModal.value = true
}

function renameFolderPrompt(folder) {
  folderModalType.value = 'rename'
  folderModalName.value = folder.name
  folderModalTarget.value = folder
  showFolderModal.value = true
}

function deleteFolderConfirm(folder) {
  folderModalType.value = 'delete'
  folderModalTarget.value = folder
  showFolderModal.value = true
}

function cancelRecommend(id) {
  folderModalType.value = 'confirm_cancel'
  folderModalTarget.value = id
  showFolderModal.value = true
}

function submitFolderModal() {
  if (folderModalType.value === 'create') {
    const name = folderModalName.value.trim()
    if (name) {
      const newFolder = addFolder(name)
      if (newFolder) {
        showToast(`收藏夹 [${newFolder.name}] 创建成功！`, 'success')
        activeFolderId.value = newFolder.id
      }
    }
  } else if (folderModalType.value === 'rename') {
    const name = folderModalName.value.trim()
    const folder = folderModalTarget.value
    if (name && folder && name !== folder.name) {
      renameFolder(folder.id, name)
      showToast('重命名成功！', 'success')
    }
  } else if (folderModalType.value === 'delete') {
    const folder = folderModalTarget.value
    if (folder) {
      if (activeFolderId.value === folder.id) {
        activeFolderId.value = 'all'
      }
      deleteFolder(folder.id)
      showToast('删除成功！', 'success')
    }
  } else if (folderModalType.value === 'confirm_cancel') {
    const id = folderModalTarget.value
    if (id && watchlist[id]) {
      watchlist[id].recommended = false
      watchlist[id].updatedAt = Date.now()
      showToast('已撤销推荐', 'info')
    }
  }
  closeFolderModal()
}

function closeFolderModal() {
  showFolderModal.value = false
  folderModalName.value = ''
  folderModalTarget.value = null
}

// 编辑理由
function startEdit(item) {
  editingId.value = item.subject.id
  editingReason.value = item.recommendationReason || ''
}

function cancelEdit() {
  editingId.value = null
  editingReason.value = ''
}

function saveEdit(id) {
  if (watchlist[id]) {
    watchlist[id].recommendationReason = editingReason.value.trim()
    watchlist[id].updatedAt = Date.now()
    showToast('推荐语已更新！', 'success')
  }
  editingId.value = null
  editingReason.value = ''
}

// 图像生成加载辅助
function waitForImages(element) {
  const images = element.getElementsByTagName('img')
  const promises = Array.from(images).map(img => {
    if (img.complete && img.naturalWidth !== 0) {
      return Promise.resolve()
    }
    return new Promise(resolve => {
      img.onload = resolve
      img.onerror = resolve
    })
  })
  return Promise.all(promises)
}

// ===================== 内置截图分享 =====================
async function exportImage() {
  if (exportingType.value !== null) return
  exportingType.value = 'image'
  showToast('正在生成荐番海报，请稍候...', 'info')
  
  await nextTick()
  const element = document.getElementById('recommendations-share-area')
  if (!element) {
    exportingType.value = null
    showToast('导出失败：找不到容器', 'error')
    return
  }

  await waitForImages(element)
  await new Promise(resolve => setTimeout(resolve, 300))

  try {
    const isDark = getTheme() === 'dark'
    const canvas = await window.html2canvas(element, {
      useCORS: true,
      allowTaint: false,
      backgroundColor: isDark ? '#17181a' : '#f4f4f4',
      scale: 2,
      logging: false
    })

    const link = document.createElement('a')
    link.download = `我的荐番墙_${activeFolderName.value}_${Date.now()}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
    
    showToast('海报截图已生成并开始下载！🎉', 'success')
  } catch (err) {
    console.error('[Export Image]', err)
    showToast('图片生成失败，请重试。', 'error')
  } finally {
    exportingType.value = null
  }
}

// ===================== JSON 导入导出 =====================
function exportJSON() {
  try {
    const data = {
      version: 1,
      folders: JSON.parse(JSON.stringify(folders.value)),
      recommendations: Object.values(watchlist).filter(item => item.recommended === true)
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const link = document.createElement('a')
    link.download = `我的荐番墙_备份_${Date.now()}.json`
    link.href = URL.createObjectURL(blob)
    link.click()
    showToast('JSON 备份导出成功！', 'success')
  } catch (err) {
    console.error(err)
    showToast('导出 JSON 失败', 'error')
  }
}

function importJSON(e) {
  const file = e.target.files[0]
  if (!file) return
  
  const reader = new FileReader()
  reader.onload = (evt) => {
    try {
      const data = JSON.parse(evt.target.result)
      let count = 0
      
      // 新版格式：包含 folders 和 recommendations
      if (data && data.recommendations && Array.isArray(data.recommendations)) {
        // 1. 恢复文件夹结构并做 ID 映射防止冲突
        const folderIdMap = {}
        if (data.folders && Array.isArray(data.folders)) {
          data.folders.forEach(oldFolder => {
            const added = addFolder(oldFolder.name)
            if (added) {
              folderIdMap[oldFolder.id] = added.id
            }
          })
        }
        
        // 2. 恢复推荐项
        data.recommendations.forEach(item => {
          const id = item.subject.id
          if (!watchlist[id]) {
            // 如果本地 watchlist 还没有这个番，初始化它
            watchlist[id] = {
              subject: item.subject,
              status: item.status || 'watching',
              watchedEpisodes: item.watchedEpisodes || [],
              addedAt: item.addedAt || Date.now(),
              updatedAt: Date.now()
            }
          }
          
          watchlist[id].recommended = true
          watchlist[id].recommendationReason = item.recommendationReason || ''
          watchlist[id].recommendedAt = item.recommendedAt || Date.now()
          watchlist[id].updatedAt = Date.now()
          
          if (item.folderId) {
            watchlist[id].folderId = folderIdMap[item.folderId] || null
          }
          count++
        })
      } 
      // 兼容旧版本格式（直接是数组）
      else if (Array.isArray(data)) {
        data.forEach(item => {
          if (item.subject && item.subject.id) {
            const id = item.subject.id
            if (!watchlist[id]) {
              watchlist[id] = {
                subject: item.subject,
                status: item.status || 'watching',
                watchedEpisodes: item.watchedEpisodes || [],
                addedAt: item.addedAt || Date.now(),
                updatedAt: Date.now()
              }
            }
            watchlist[id].recommended = true
            watchlist[id].recommendationReason = item.recommendationReason || ''
            watchlist[id].recommendedAt = item.recommendedAt || Date.now()
            watchlist[id].updatedAt = Date.now()
            count++
          }
        })
      } else {
        throw new Error('不合法的备份文件格式')
      }
      
      showToast(`成功导入并合并 ${count} 个推荐项！`, 'success')
      // 重置 activeFolderId 到 all，刷新界面
      activeFolderId.value = 'all'
      // 重置 input 以便能再次导入同名文件
      e.target.value = ''
    } catch (err) {
      console.error(err)
      showToast('导入失败：备份文件格式损坏或不合法', 'error')
    }
  }
  reader.readAsText(file)
}

// ===================== 分享编码 导入导出 =====================
function exportShareCode() {
  const listToEncode = recommendedList.value.slice(0, 24)
  if (listToEncode.length === 0) {
    showToast('当前视图没有可分享的番剧！', 'warning')
    return
  }
  
  // 文件夹名前缀
  const namePrefix = (activeFolderId.value !== 'all' && activeFolderId.value !== 'unclassified')
    ? (folders.value.find(f => f.id === activeFolderId.value)?.name.slice(0, 15) || '') + ':'
    : ''
    
  const encodedIds = listToEncode.map(item => Number(item.subject.id).toString(36)).join('.')
  const code = namePrefix + encodedIds
  
  if (code.length > 150) {
    // 保护性截断（以防万一）
    showToast('推荐的番剧过多，已自动截取前部番剧以满足 150 字符限制。', 'info')
  }
  
  navigator.clipboard.writeText(code)
    .then(() => {
      importingCode.value = code // 填充输入框便于展示
      showToast('分享编码已成功复制到剪贴板！🎉', 'success')
    })
    .catch(err => {
      console.error(err)
      importingCode.value = code
      showToast('自动复制失败，请手动选择输入框中的内容复制。', 'info')
    })
}

async function importShareCode() {
  const code = (importingCode.value || '').trim()
  if (!code) {
    showToast('请输入有效的分享编码', 'warning')
    return
  }
  
  let folderName = ''
  let idsPart = code
  
  const colonIndex = code.indexOf(':')
  if (colonIndex !== -1) {
    folderName = code.substring(0, colonIndex).trim()
    idsPart = code.substring(colonIndex + 1).trim()
  }
  
  if (!idsPart) {
    showToast('分享编码解析失败：缺少番剧数据', 'error')
    return
  }
  
  const parts = idsPart.split('.').filter(p => !!p.trim())
  const ids = parts.map(p => parseInt(p, 36)).filter(id => !isNaN(id))
  
  if (ids.length === 0) {
    showToast('分享编码中未解析到有效的番剧 ID', 'error')
    return
  }
  
  isLoading.value = true
  showToast('开始解析分享编码，正在获取番剧详情...', 'info')
  
  try {
    // 1. 如果有文件夹前缀，创建/获取收藏夹
    let targetFolderId = null
    if (folderName) {
      const added = addFolder(folderName)
      if (added) {
        targetFolderId = added.id
        activeFolderId.value = added.id // 自动切换到此收藏夹
      }
    }
    
    // 2. 依次检查/并行下载番剧详情（分批并行避免限流）
    let successCount = 0
    const batchSize = 4
    
    for (let i = 0; i < ids.length; i += batchSize) {
      const batchIds = ids.slice(i, i + batchSize)
      await Promise.all(batchIds.map(async (id) => {
        if (watchlist[id]) {
          // 本地已存在详情，直接设为推荐，并移入文件夹
          watchlist[id].recommended = true
          watchlist[id].folderId = targetFolderId
          watchlist[id].recommendedAt = Date.now()
          watchlist[id].updatedAt = Date.now()
          successCount++
        } else {
          // 本地不存在，调用 API 获取详情
          try {
            const detail = await getSubjectDetail(id)
            if (detail && detail.id) {
              const epsCount = detail.eps_count || detail.total_episodes || detail.eps || 0
              watchlist[id] = {
                subject: {
                  id: detail.id,
                  name: detail.name,
                  name_cn: detail.name_cn,
                  images: detail.images,
                  eps_count: epsCount,
                  rating: detail.rating,
                  air_date: detail.air_date || detail.date || ''
                },
                status: 'watching',
                watchedEpisodes: [],
                addedAt: Date.now(),
                recommended: true,
                folderId: targetFolderId,
                recommendedAt: Date.now(),
                updatedAt: Date.now()
              }
              successCount++
            }
          } catch (err) {
            console.error(`获取番剧 ID ${id} 失败:`, err)
          }
        }
      }))
    }
    
    showToast(`导入成功！解析了 ${successCount}/${ids.length} 部推荐番剧。`, 'success')
    importingCode.value = ''
  } catch (err) {
    console.error(err)
    showToast('解析导入失败，请检查网络或编码格式。', 'error')
  } finally {
    isLoading.value = false
  }
}
</script>
