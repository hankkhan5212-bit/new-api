/**
 * 遍历 api/ 目录，解析所有 MDX 文件的 frontmatter 和 meta.json，
 * 生成 src/data/api-endpoints.json 供前端组件使用。
 *
 * 运行: bun run scripts/generate-api-data.ts
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ---------------------------------------------------------------------------
// 类型定义
// ---------------------------------------------------------------------------

interface ApiEndpoint {
  title: string
  method: string
  path: string
  description: string
  authLevel: string
  id: string
}

interface SubCategory {
  title: string
  key: string
  icon: string
  endpoints: ApiEndpoint[]
}

interface MainCategory {
  title: string
  key: string
  icon: string
  description: string
  subCategories: SubCategory[]
}

// ---------------------------------------------------------------------------
// 解析工具
// ---------------------------------------------------------------------------

/** 提取 YAML frontmatter 原始文本 */
function extractFrontmatterRaw(content: string): string | null {
  // 统一换行符为 \n，兼容 Windows
  const normalized = content.replace(/\r\n/g, '\n')
  const match = normalized.match(/^---\n([\s\S]*?)\n---/)
  return match ? match[1] : null
}

/** 解析 YAML _openapi.method */
function parseMethod(yaml: string): string {
  const m = yaml.match(/\bmethod:\s*(\w+)/)
  return m ? m[1].toUpperCase() : 'GET'
}

/** 解析 structuredData.contents[].content（支持多行 `|` 和单行） */
function parseDescription(yaml: string): string {
  // 多行 literal block: - content: |
  //                       第一行
  //                       第二行
  const multilineMatch = yaml.match(/contents:[\s\S]*?-\s+content:\s*\|\s*\n([\s\S]*?)(?=\n  \w|\n\w|\n-|\n\Z)/)
  if (multilineMatch) {
    return multilineMatch[1]
      .split('\n')
      .map(l => l.replace(/^\s{8,}/, ''))
      .join(' ')
      .trim()
      .replace(/\n/g, ' ')
  }

  // 单行: - content: "xxx"
  const singleMatch = yaml.match(/contents:[\s\S]*?-\s+content:\s*['"]([^'"]+)['"]/)
  if (singleMatch) return singleMatch[1]

  // 单行无引号: - content: xxx
  const plainMatch = yaml.match(/contents:[\s\S]*?-\s+content:\s*(.+?)\s*$/)
  if (plainMatch) return plainMatch[1].trim()

  return ''
}

/** 从 APIPage 标签解析 path 和 method */
function parseApiPageTag(content: string): { method: string; path: string } | null {
  // 匹配 operations={[{"path":"/api/xxx","method":"get"}]}
  const opsMatch = content.match(/"path"\s*:\s*"([^"]+)"/)
  const methodMatch = content.match(/"method"\s*:\s*"([^"]+)"/)
  if (opsMatch) {
    return {
      path: opsMatch[1],
      method: methodMatch ? methodMatch[1].toUpperCase() : 'GET',
    }
  }
  return null
}

function extractAuthLevel(description: string): string {
  if (description.includes('Root') || description.includes('超级管理员') || description.includes('👑')) return 'root'
  if (description.includes('Admin') || description.includes('管理员') || description.includes('👨‍💼')) return 'admin'
  if (description.includes('User') || description.includes('登录') || description.includes('🔐')) return 'user'
  return 'public'
}

// ---------------------------------------------------------------------------
// 扫描逻辑
// ---------------------------------------------------------------------------

const AI_SUB_ICONS: Record<string, string> = {
  chat:          'MessageSquare',
  completions:   'FileText',
  embeddings:    'Brain',
  images:        'Image',
  videos:        'Film',
  audio:         'Volume2',
  models:        'Box',
  moderations:   'Shield',
  realtime:      'Radio',
  rerank:        'ArrowUpDown',
  unimplemented: 'FileQuestion',
}

const MGMT_SUB_ICONS: Record<string, string> = {
  'user-auth':               'LogIn',
  'user-management':         'Users',
  'token-management':        'Key',
  'channel-management':      'Network',
  'model-management':        'Boxes',
  'two-factor-auth':         'Fingerprint',
  oauth:                     'Link',
  groups:                    'FolderTree',
  payment:                   'CreditCard',
  redemption:                'Ticket',
  statistics:                'BarChart3',
  tasks:                     'ListTodo',
  'security-verification':   'ShieldCheck',
  'system-settings':         'Settings',
  vendors:                   'Store',
  system:                    'Server',
  default:                   'FileText',
}

const AI_SUB_ORDER: Record<string, number> = {
  models: 0, chat: 1, completions: 2, embeddings: 3, rerank: 4,
  moderations: 5, audio: 6, images: 7, videos: 8, realtime: 9,
  unimplemented: 10,
}

const MGMT_SUB_ORDER: Record<string, number> = {
  'system': 0, 'system-settings': 1, 'user-auth': 2, 'user-management': 3,
  'two-factor-auth': 4, oauth: 5, 'token-management': 6, 'channel-management': 7,
  'model-management': 8, groups: 9, payment: 10, redemption: 11,
  statistics: 12, tasks: 13, 'security-verification': 14, vendors: 15,
  default: 16,
}

function parseMdx(filePath: string, fallbackTitle: string): ApiEndpoint | null {
  const rawContent = fs.readFileSync(filePath, 'utf-8')
  // 统一换行符为 \n
  const content = rawContent.replace(/\r\n/g, '\n')
  const yaml = extractFrontmatterRaw(content)
  if (!yaml) return null

  const title = (yaml.match(/^title:\s*(.+)$/m) || [])[1]?.trim() || fallbackTitle

  // 优先从 APIPage 标签取 path 和 method（最精确）
  const tagInfo = parseApiPageTag(content)
  let method: string
  let apiPath: string
  let description: string

  if (tagInfo) {
    method = tagInfo.method
    apiPath = tagInfo.path
    description = parseDescription(yaml)
  } else {
    method = parseMethod(yaml)
    apiPath = ''
    description = parseDescription(yaml)
  }

  // 从 yaml 找 path（如果 APIPage 没找到）
  if (!apiPath) {
    const pathMatch = content.match(/operations=\{\[\{"path":"([^"]+)"\}\s*\]\}/)
    if (pathMatch) apiPath = pathMatch[1]
  }

  const authLevel = extractAuthLevel(description || '')

  const relativePath = path.relative(
    path.resolve(__dirname, '..', 'api'),
    filePath,
  )
  const id = relativePath.replace(/\\/g, '/').replace('.mdx', '')

  return {
    title,
    method,
    path: apiPath,
    description,
    authLevel,
    id,
  }
}

/** 递归扫描目录，收集所有 mdx（包含嵌套子目录如 openai/, gemini/） */
function scanMdxRecursive(dir: string): ApiEndpoint[] {
  const eps: ApiEndpoint[] = []
  if (!fs.existsSync(dir)) return eps

  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      eps.push(...scanMdxRecursive(fullPath))
    } else if (entry.isFile() && entry.name.endsWith('.mdx')) {
      // 跳过 auth.mdx（鉴权说明文档）
      if (entry.name === 'auth.mdx') continue
      const ep = parseMdx(fullPath, entry.name.replace('.mdx', ''))
      if (ep) eps.push(ep)
    }
  }
  return eps
}

function processCategory(
  categoryKey: string,
  icon: string,
  subOrderMap: Record<string, number>,
  subIconMap: Record<string, string>,
): MainCategory {
  const categoryDir = path.resolve(__dirname, '..', 'api', categoryKey)
  const metaPath = path.join(categoryDir, 'meta.json')
  const meta = fs.existsSync(metaPath)
    ? JSON.parse(fs.readFileSync(metaPath, 'utf-8'))
    : { title: categoryKey }

  const subCategories: SubCategory[] = []

  const entries = fs.readdirSync(categoryDir, { withFileTypes: true })
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const subDir = path.join(categoryDir, entry.name)
    const subMetaPath = path.join(subDir, 'meta.json')
    if (!fs.existsSync(subMetaPath)) continue

    const subMeta = JSON.parse(fs.readFileSync(subMetaPath, 'utf-8'))
    const endpoints = scanMdxRecursive(subDir)

    if (endpoints.length > 0) {
      // 过滤：只保留 public 和 user 权限的端点
      const filtered = endpoints.filter(e => e.authLevel === 'public' || e.authLevel === 'user')
      const key = entry.name
      if (filtered.length > 0) {
        subCategories.push({
          title: subMeta.title || entry.name,
          key,
          icon: subIconMap[key] || 'FileText',
          endpoints: filtered.sort((a, b) => a.title.localeCompare(b.title)),
        })
      }
    }
  }

  // 排序
  subCategories.sort((a, b) => {
    const oa = subOrderMap[a.key] ?? 99
    const ob = subOrderMap[b.key] ?? 99
    return oa - ob
  })

  return {
    title: meta.title || categoryKey,
    key: categoryKey,
    icon,
    description: meta.description || '',
    subCategories,
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  console.log('Generating API data...')

  const aiModel = processCategory('ai-model', 'Cpu', AI_SUB_ORDER, AI_SUB_ICONS)
  const management = processCategory('management', 'Settings', MGMT_SUB_ORDER, MGMT_SUB_ICONS)

  // 过滤掉名称为 "default" 的目录
  management.subCategories = management.subCategories.filter(s => s.key !== 'default' && s.title !== 'default')

  // 移除不需要对外的管理子类别
  const excludedMgmtKeys = new Set(['payment', 'oauth', 'two-factor-auth', 'system', 'user-auth', 'user-management', 'security-verification'])
  management.subCategories = management.subCategories.filter(s => !excludedMgmtKeys.has(s.key))

  // 移除 AI 模型中的"未实现"子类别
  aiModel.subCategories = aiModel.subCategories.filter(s => s.key !== 'unimplemented')

  const result = [aiModel, management]

  const outDir = path.resolve(__dirname, '..', 'src', 'data')
  const outFile = path.join(outDir, 'api-endpoints.json')
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

  fs.writeFileSync(outFile, JSON.stringify(result, null, 2), 'utf-8')

  const total = result.reduce(
    (s, c) => s + c.subCategories.reduce((ss, sc) => ss + sc.endpoints.length, 0), 0,
  )
  console.log(`Done! → ${outFile}`)
  console.log(`  ${result[0].subCategories.length} + ${result[1].subCategories.length} sub-categories, ${total} endpoints`)
}

main()
