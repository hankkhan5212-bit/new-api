import React, { useState } from 'react'
import {
  MessageSquare, FileText, Brain, Image, Film, Volume2, Box, Shield,
  Radio, ArrowUpDown, FileQuestion, Cpu, Settings,
  LogIn, Users, Key, Network, Boxes, Fingerprint, Link, FolderTree,
  CreditCard, Ticket, BarChart3, ListTodo, ShieldCheck, Store, Server,
  ChevronDown, ChevronRight,
} from 'lucide-react'
import apiData from '../data/api-endpoints.json'

type Endpoint = {
  title: string
  method: string
  path: string
  description: string
  authLevel: string
  id: string
}

type SubCategory = {
  title: string
  key: string
  icon: string
  endpoints: Endpoint[]
}

type Category = {
  title: string
  key: string
  icon: string
  description: string
  subCategories: SubCategory[]
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  MessageSquare, FileText, Brain, Image, Film, Volume2, Box, Shield,
  Radio, ArrowUpDown, FileQuestion, Cpu, Settings,
  LogIn, Users, Key, Network, Boxes, Fingerprint, Link, FolderTree,
  CreditCard, Ticket, BarChart3, ListTodo, ShieldCheck, Store, Server,
}

const methodColors: Record<string, string> = {
  GET: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  POST: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  PUT: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  DELETE: 'bg-red-500/10 text-red-400 border-red-500/20',
  PATCH: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
}

interface NavigationProps {
  activeEndpointId: string | null
  onEndpointSelect: (endpoint: Endpoint) => void
}

export default function Navigation({ activeEndpointId, onEndpointSelect }: NavigationProps) {
  const categories = apiData as Category[]
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(categories.map(c => [c.key, true]))
  )
  const [expandedSubs, setExpandedSubs] = useState<Record<string, boolean>>({})

  const toggleCat = (key: string) => setExpandedCats(prev => ({ ...prev, [key]: !prev[key] }))
  const toggleSub = (key: string) => setExpandedSubs(prev => ({ ...prev, [key]: !prev[key] }))

  return (
    <aside className="w-64 bg-zinc-950 border-r border-zinc-800 flex flex-col h-[calc(100vh-64px)] overflow-y-auto sticky top-16 select-none shrink-0 scrollbar-thin">
      <div className="p-3 space-y-1">
        {categories.map(cat => {
          const CatIcon = iconMap[cat.icon] || Cpu
          const isCatOpen = expandedCats[cat.key] !== false
          return (
            <div key={cat.key}>
              {/* 一级分类 */}
              <button
                onClick={() => toggleCat(cat.key)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs font-semibold text-zinc-300 hover:bg-zinc-900/60 transition"
              >
                {isCatOpen ? <ChevronDown className="w-3.5 h-3.5 text-zinc-500" /> : <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />}
                <CatIcon className="w-4 h-4 text-emerald-400" />
                <span>{cat.title}</span>
              </button>

              {isCatOpen && (
                <div className="ml-2 border-l border-zinc-800/60 pl-2 space-y-0.5">
                  {cat.subCategories.map(sub => {
                    const SubIcon = iconMap[sub.icon] || FileText
                    const isSubOpen = expandedSubs[sub.key] !== false
                    return (
                      <div key={sub.key}>
                        {/* 二级分类 */}
                        <button
                          onClick={() => toggleSub(sub.key)}
                          className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-[11px] font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40 transition"
                        >
                          {isSubOpen ? <ChevronDown className="w-3 h-3 text-zinc-600" /> : <ChevronRight className="w-3 h-3 text-zinc-600" />}
                          <SubIcon className="w-3.5 h-3.5 text-zinc-500" />
                          <span className="truncate">{sub.title}</span>
                        </button>

                        {isSubOpen && (
                          <div className="ml-3 border-l border-zinc-800/40 pl-2 space-y-0.5">
                            {sub.endpoints.map(ep => {
                              const isActive = activeEndpointId === ep.id
                              return (
                                <button
                                  key={ep.id}
                                  onClick={() => onEndpointSelect(ep)}
                                  className={`w-full flex items-center gap-1.5 px-2 py-1 rounded text-[11px] text-left transition ${
                                    isActive
                                      ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/40'
                                  }`}
                                >
                                  <span className={`shrink-0 text-[9px] px-1 py-0 rounded font-mono font-bold border ${methodColors[ep.method] || methodColors.GET}`}>
                                    {ep.method}
                                  </span>
                                  <span className="truncate">{ep.title}</span>
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 底部状态 */}
      <div className="mt-auto p-4 border-t border-zinc-900 bg-zinc-950/80 text-[11px] text-zinc-500 space-y-2">
        <div className="flex items-center gap-1.5 text-zinc-400 font-medium">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span>API Reference</span>
        </div>
        <p className="leading-normal">
          {categories.reduce((s, c) => s + c.subCategories.reduce((ss, sc) => ss + sc.endpoints.length, 0), 0)} endpoints documented.
        </p>
      </div>
    </aside>
  )
}
