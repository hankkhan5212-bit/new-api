import React from 'react'
import { Terminal, Shield, BookOpen, Info } from 'lucide-react'

type Endpoint = {
  title: string
  method: string
  path: string
  description: string
  authLevel: string
  id: string
}

const methodColors: Record<string, string> = {
  GET: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  POST: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  PUT: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  DELETE: 'bg-red-500/10 text-red-400 border-red-500/20',
  PATCH: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
}

const authLabels: Record<string, { label: string; color: string }> = {
  public: { label: '公开', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  user: { label: '用户', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  admin: { label: '管理员', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  root: { label: 'Root', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
}

interface ApiExplorerProps {
  endpoint: Endpoint | null
}

export default function ApiExplorer({ endpoint }: ApiExplorerProps) {
  if (!endpoint) {
    return (
      <div className="flex-1 max-w-4xl px-8 py-10 flex items-center justify-center">
        <div className="text-center space-y-4">
          <BookOpen className="w-12 h-12 text-zinc-700 mx-auto" />
          <h2 className="text-xl font-bold text-zinc-400 font-display">New API Reference</h2>
          <p className="text-sm text-zinc-500 max-w-md">
            从左侧导航栏选择一个 API 端点查看详细信息。覆盖 AI 模型接口和管理后台接口。
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-zinc-600">
            <Info className="w-3.5 h-3.5" />
            <span>点击端点名称查看详情</span>
          </div>
        </div>
      </div>
    )
  }

  const auth = authLabels[endpoint.authLevel] || authLabels.public
  const methodColor = methodColors[endpoint.method] || methodColors.GET

  return (
    <div className="flex-1 max-w-4xl px-8 py-10 space-y-8">
      {/* 端点概览 */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded border ${methodColor}`}>
            {endpoint.method}
          </span>
          {endpoint.path && (
            <code className="text-sm text-zinc-200 font-mono font-semibold bg-zinc-900 px-3 py-1 rounded-lg border border-zinc-800">
              {endpoint.path}
            </code>
          )}
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${auth.color}`}>
            <Shield className="w-3 h-3 inline mr-1 -mt-0.5" />
            {auth.label}
          </span>
        </div>

        <h1 className="text-2xl font-bold font-display text-white tracking-tight">
          {endpoint.title}
        </h1>

        {endpoint.description && (
          <p className="text-sm text-zinc-400 leading-relaxed">
            {endpoint.description}
          </p>
        )}
      </section>

      {/* 请求信息 */}
      {endpoint.path && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 font-medium text-xs uppercase tracking-wider">
            <Terminal className="w-4 h-4" />
            <span>Request</span>
          </div>

          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">HTTP Method</div>
            <code className={`text-xs font-mono font-bold px-2 py-0.5 rounded border inline-block ${methodColor}`}>
              {endpoint.method}
            </code>

            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mt-3">Endpoint Path</div>
            <code className="text-xs text-emerald-400 font-mono font-semibold select-all break-all bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800 block">
              {endpoint.path}
            </code>

            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mt-3">Authentication</div>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border inline-block ${auth.color}`}>
              {auth.label}
            </span>
          </div>
        </section>
      )}

      {/* API 通用说明 */}
      <section className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/60 space-y-3">
        <h3 className="text-sm font-semibold text-zinc-300">通用说明</h3>
        <ul className="space-y-2 text-xs text-zinc-400">
          <li className="flex items-start gap-2">
            <span className="text-emerald-400 mt-0.5">•</span>
            <span>所有 AI 模型接口兼容 OpenAI API 格式，可无缝切换上游供应商。</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-400 mt-0.5">•</span>
            <span>管理接口支持 Session 和 Access Token 两种认证方式。</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-400 mt-0.5">•</span>
            <span>生产环境请使用 HTTPS，并在请求头中携带对应的认证信息。</span>
          </li>
        </ul>
      </section>
    </div>
  )
}
