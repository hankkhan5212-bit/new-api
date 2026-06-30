import React, { useState } from 'react'
import Navigation from './components/Navigation'
import ApiExplorer from './components/ApiExplorer'
import { Network, BookOpen } from 'lucide-react'

type Endpoint = {
  title: string
  method: string
  path: string
  description: string
  authLevel: string
  id: string
}

export default function App() {
  const [selectedEndpoint, setSelectedEndpoint] = useState<Endpoint | null>(null)

  return (
    <div className="min-h-screen bg-zinc-950 font-sans text-zinc-100 flex flex-col selection:bg-emerald-500/30 selection:text-white">

      {/* Header */}
      <header className="h-16 bg-zinc-950 border-b border-zinc-900 px-6 flex items-center justify-between sticky top-0 z-30 select-none">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 via-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/10">
            <Network className="w-5 h-5 text-black font-extrabold stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm tracking-tight font-display text-white">
                TokenTurbo
              </span>
              <span className="text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full font-semibold">
                API Reference
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 font-mono">Tokenturbo Documentation</p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-zinc-900/50 border border-zinc-900 rounded-lg">
          <BookOpen className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold text-zinc-300">API Reference</span>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        <Navigation
          activeEndpointId={selectedEndpoint?.id ?? null}
          onEndpointSelect={setSelectedEndpoint}
        />

        <main className="flex-1 overflow-y-auto bg-zinc-950 scroll-smooth">
          <ApiExplorer endpoint={selectedEndpoint} />
        </main>
      </div>

    </div>
  )
}
