// Bangumi API 服务层
import { getApiToken } from '../stores/watchlist'

const BASE_URL = '/api'

const headers = {
  'User-Agent': 'BangumiTracker/1.0 (https://github.com/user/bangumi-tracker)',
  'Accept': 'application/json'
}

function getAuthHeaders() {
  return {
    ...headers,
    'Authorization': `Bearer ${getApiToken()}`
  }
}

/**
 * 通用请求方法
 */
async function request(url, options = {}) {
  const { auth = false, method = 'GET', body = null } = options

  const config = {
    method,
    headers: auth ? { ...getAuthHeaders() } : { ...headers }
  }

  if (body) {
    config.headers['Content-Type'] = 'application/json'
    config.body = JSON.stringify(body)
  }

  try {
    const response = await fetch(url, config)

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error(`[BangumiAPI] Request failed: ${url}`, error)
    throw error
  }
}

/**
 * 每日放送
 * @returns {Promise<Array>} 按星期分组的番剧列表
 */
export async function getCalendar() {
  return request(`${BASE_URL}/calendar`)
}

/**
 * 搜索番剧
 * @param {string} keyword - 搜索关键词
 * @param {number} type - 类型 (2=动画)
 * @param {number} start - 起始位置
 * @param {number} max - 最大返回数
 * @returns {Promise<Object>} 搜索结果 { results, list }
 */
export async function searchSubjects(keyword, type = 2, start = 0, max = 25, extraFilter = {}) {
  const res = await request(`${BASE_URL}/v0/search/subjects?limit=${max}&offset=${start}`, {
    method: 'POST',
    body: {
      keyword: keyword,
      filter: {
        type: [type],
        ...extraFilter
      }
    }
  })
  return {
    results: res.total || 0,
    list: res.data || []
  }
}

/**
 * 获取番剧详情 (v0 API)
 * @param {number} id - 番剧 ID
 * @returns {Promise<Object>} 番剧详细信息
 */
export async function getSubjectDetail(id) {
  return request(`${BASE_URL}/v0/subjects/${id}`)
}

/**
 * 获取番剧集数列表 (v0 API)
 * @param {number} subjectId - 番剧 ID
 * @param {number} type - 集数类型 (0=本篇)
 * @param {number} limit - 每页数量
 * @param {number} offset - 偏移量
 * @returns {Promise<Object>} 集数列表 { data, total, limit, offset }
 */
export async function getEpisodes(subjectId, type = null, limit = 200, offset = 0) {
  let url = `${BASE_URL}/v0/episodes?subject_id=${subjectId}&limit=${limit}&offset=${offset}`
  if (type !== null) {
    url += `&type=${type}`
  }
  return request(url)
}

/**
 * 获取番剧角色列表 (v0 API)
 * @param {number} id - 番剧 ID
 * @returns {Promise<Array>} 角色列表
 */
export async function getSubjectCharacters(id) {
  return request(`${BASE_URL}/v0/subjects/${id}/characters`)
}

/**
 * 获取番剧相关条目 (v0 API)
 * @param {number} id - 番剧 ID
 * @returns {Promise<Array>} 相关条目
 */
export async function getSubjectRelations(id) {
  return request(`${BASE_URL}/v0/subjects/${id}/subjects`)
}

/**
 * 格式化并规范化图片URL协议为https
 */
function normalizeImageUrl(url) {
  if (!url) return ''
  if (url.startsWith('http://lain.bgm.tv')) {
    return url.replace('http://lain.bgm.tv', 'https://lain.bgm.tv')
  }
  return url
}

/**
 * 获取大图URL
 * @param {Object} images - 图片对象
 * @returns {string} 大图URL
 */
export function getLargeImage(images) {
  if (!images) return ''
  const url = images.large || images.common || images.medium || images.small || ''
  return normalizeImageUrl(url)
}

/**
 * 获取中图URL
 */
export function getMediumImage(images) {
  if (!images) return ''
  const url = images.common || images.medium || images.large || images.small || ''
  return normalizeImageUrl(url)
}

/**
 * 获取小图URL
 */
export function getSmallImage(images) {
  if (!images) return ''
  const url = images.medium || images.small || images.common || images.grid || ''
  return normalizeImageUrl(url)
}

/**
 * 格式化评分
 */
export function formatRating(score) {
  if (!score) return 'N/A'
  return score.toFixed(1)
}

/**
 * 获取星期对应的中文名
 */
export function getWeekdayCN(id) {
  const map = {
    1: '周一', 2: '周二', 3: '周三', 4: '周四',
    5: '周五', 6: '周六', 7: '周日'
  }
  return map[id] || '未知'
}

/**
 * 获取今天的星期 ID (1-7)
 */
export function getTodayWeekday() {
  const day = new Date().getDay()
  return day === 0 ? 7 : day
}

/**
 * 从 infobox 中提取特定字段
 */
export function getInfoboxValue(infobox, key) {
  if (!infobox) return null
  const item = infobox.find(i => i.key === key)
  if (!item) return null
  if (typeof item.value === 'string') return item.value
  if (Array.isArray(item.value)) return item.value.map(v => v.v || v).join('、')
  return null
}

/**
 * 提取播放平台信息
 */
export function getPlatform(subject) {
  if (!subject) return null
  // v0 API 直接有 platform 字段
  if (subject.platform) return subject.platform
  // 从 infobox 中提取
  return getInfoboxValue(subject.infobox, '播放电视台') ||
         getInfoboxValue(subject.infobox, '放送平台') ||
         null
}
