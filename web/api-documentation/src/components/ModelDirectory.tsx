import React, { useState, useEffect } from "react";
import { Model } from "../types";
import { 
  Search, 
  Cpu, 
  Calculator, 
  Check, 
  Sparkles, 
  ArrowRight, 
  Coins, 
  BadgeHelp,
  AlertCircle,
  TrendingDown
} from "lucide-react";

interface ModelDirectoryProps {
  models: Model[];
  selectedModelId: string;
  onSelectModel: (modelId: string) => void;
}

export default function ModelDirectory({ models, selectedModelId, onSelectModel }: ModelDirectoryProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<string>("All");
  const [calculatorPrompts, setCalculatorPrompts] = useState<number>(100000); // 100k tokens
  const [calculatorCompletions, setCalculatorCompletions] = useState<number>(50000); // 50k tokens
  const [frequency, setFrequency] = useState<"day" | "month">("month");

  // Filter models
  const providers = ["All", ...Array.from(new Set(models.map(m => m.provider)))];

  const filteredModels = models.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          m.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          m.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProvider = selectedProvider === "All" || m.provider === selectedProvider;
    return matchesSearch && matchesProvider;
  });

  // Calculate costs helper
  const getCostEstimate = (model: Model) => {
    const promptCostPerToken = parseFloat(model.pricing.prompt) / 1000000;
    const completionCostPerToken = parseFloat(model.pricing.completion) / 1000000;
    
    const promptTotal = calculatorPrompts * promptCostPerToken;
    const completionTotal = calculatorCompletions * completionCostPerToken;
    
    const total = promptTotal + completionTotal;
    const factor = frequency === "day" ? 30 : 1; // display as monthly or daily
    return (total * factor).toFixed(4);
  };

  return (
    <div className="space-y-10 text-zinc-300">
      
      {/* 1. Header and Quick info */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-emerald-400 font-medium text-xs uppercase tracking-wider">
          <Cpu className="w-4.5 h-4.5" />
          <span>Unified Model Registry</span>
        </div>
        <h2 className="text-2xl font-bold font-display text-white tracking-tight">
          Supported Language Models
        </h2>
        <p className="text-sm text-zinc-400 leading-relaxed max-w-3xl">
          OpenRouter supports instant routing to over 100+ foundational models. Below are the core high-performance providers available in the sandbox playground environment. Compare contexts, token pricing, and configure fallbacks instantly.
        </p>
      </div>

      {/* 2. Interactive Calculator Panel */}
      <div className="p-6 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
                <span>Unified Token Price Calculator</span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
                  Reactive
                </span>
              </h3>
              <p className="text-[11px] text-zinc-400">Estimate prompt/completion billing across top providers instantly</p>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-1 rounded-lg">
            <button
              onClick={() => setFrequency("day")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition ${frequency === "day" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20" : "text-zinc-400 hover:text-zinc-200"}`}
              id="calc-freq-day"
            >
              Daily Cost
            </button>
            <button
              onClick={() => setFrequency("month")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition ${frequency === "month" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20" : "text-zinc-400 hover:text-zinc-200"}`}
              id="calc-freq-month"
            >
              Monthly Cost
            </button>
          </div>
        </div>

        {/* Input sliders for calculation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-300">Prompt (Input) Tokens</span>
              <span className="font-mono text-emerald-400 font-bold bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800/80">
                {calculatorPrompts.toLocaleString()}
              </span>
            </div>
            <input 
              type="range" 
              min="1000" 
              max="5000000" 
              step="5000"
              value={calculatorPrompts}
              onChange={(e) => setCalculatorPrompts(Number(e.target.value))}
              className="w-full accent-emerald-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
              id="slider-prompt-tokens"
            />
            <div className="flex items-center justify-between text-[10px] text-zinc-500">
              <span>1k tokens</span>
              <span>5M tokens</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-300">Completion (Output) Tokens</span>
              <span className="font-mono text-emerald-400 font-bold bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800/80">
                {calculatorCompletions.toLocaleString()}
              </span>
            </div>
            <input 
              type="range" 
              min="1000" 
              max="5000000" 
              step="5000"
              value={calculatorCompletions}
              onChange={(e) => setCalculatorCompletions(Number(e.target.value))}
              className="w-full accent-emerald-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
              id="slider-completion-tokens"
            />
            <div className="flex items-center justify-between text-[10px] text-zinc-500">
              <span>1k tokens</span>
              <span>5M tokens</span>
            </div>
          </div>
        </div>

        {/* Price comparisons side-by-side bar */}
        <div className="pt-2 border-t border-zinc-900">
          <h4 className="text-xs font-semibold text-zinc-400 mb-4 flex items-center gap-1.5">
            <TrendingDown className="w-4 h-4 text-emerald-400" />
            <span>Estimated Price Comparison Breakdown ({frequency === "day" ? "Daily" : "Monthly"})</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            {models.map(m => {
              const est = parseFloat(getCostEstimate(m));
              const isLowCost = m.id.includes("gemini") || est < 1.0;
              return (
                <div key={m.id} className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800 flex flex-col justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{m.provider}</span>
                    <h5 className="text-xs font-semibold text-zinc-200 truncate mt-0.5">{m.name}</h5>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm font-mono font-bold text-white">${est.toFixed(2)}</span>
                    <div className="text-[9px] text-zinc-500 leading-none">
                      Est. {frequency === "day" ? "/day" : "/month"}
                    </div>
                  </div>
                  <div className={`text-[8px] px-1.5 py-0.5 rounded text-center font-bold ${isLowCost ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-800 text-zinc-400"}`}>
                    {isLowCost ? "Highly Cost Effective" : "High Performance Tier"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Models grid explorer controls */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-base font-semibold text-white">Models Registry & Presets</h3>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search models..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-56 pl-9 pr-4 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-300 focus:outline-none focus:border-emerald-500 transition placeholder-zinc-600"
                id="input-model-search"
              />
            </div>

            {/* Provider Filter buttons */}
            <div className="flex flex-wrap items-center gap-1.5 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
              {providers.map(prov => (
                <button
                  key={prov}
                  onClick={() => setSelectedProvider(prov)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${selectedProvider === prov ? "bg-zinc-900 text-emerald-400 border border-zinc-800" : "text-zinc-500 hover:text-zinc-300"}`}
                  id={`filter-provider-${prov.toLowerCase()}`}
                >
                  {prov}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Directory Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredModels.map((model) => {
            const isSelected = selectedModelId === model.id;
            return (
              <div 
                key={model.id}
                className={`p-5 rounded-2xl border transition duration-200 flex flex-col justify-between gap-4 ${
                  isSelected 
                    ? "bg-zinc-900/80 border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.05)]" 
                    : "bg-zinc-950 border-zinc-800/80 hover:border-zinc-700/80"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">
                        {model.provider}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-medium">
                        {model.latency} Latency
                      </span>
                    </div>

                    <div className="flex gap-1">
                      {model.tags.map(tag => (
                        <span 
                          key={tag}
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            tag === "New" || tag === "Fastest"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/10"
                              : tag === "Premium" || tag === "High Intelligence"
                              ? "bg-blue-500/10 text-blue-400 border border-blue-500/10"
                              : "bg-zinc-800 text-zinc-400"
                          }`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                      {model.name}
                      {isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      )}
                    </h4>
                    <code className="text-[10px] text-zinc-500 font-mono select-all block mt-0.5">
                      {model.id}
                    </code>
                  </div>

                  <p className="text-xs text-zinc-400 leading-relaxed min-h-10">
                    {model.description}
                  </p>
                </div>

                {/* Meta details footer inside card */}
                <div className="pt-4 border-t border-zinc-900 flex items-center justify-between gap-2">
                  <div className="flex gap-4">
                    <div>
                      <div className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">Context Length</div>
                      <span className="text-xs font-semibold text-zinc-300 font-mono">
                        {model.contextLength >= 1000000 
                          ? `${(model.contextLength / 1000000).toFixed(1)}M tokens` 
                          : `${(model.contextLength / 1000).toFixed(0)}k tokens`
                        }
                      </span>
                    </div>
                    <div>
                      <div className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">Pricing / 1M Prompt</div>
                      <span className="text-xs font-semibold text-zinc-300 font-mono">
                        ${parseFloat(model.pricing.prompt).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => onSelectModel(model.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      isSelected
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800"
                    }`}
                    id={`btn-select-model-${model.id.replace("/", "-")}`}
                  >
                    {isSelected ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Loaded</span>
                      </>
                    ) : (
                      <>
                        <span>Load Preset</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {filteredModels.length === 0 && (
          <div className="p-12 text-center bg-zinc-950 border border-zinc-800 rounded-2xl flex flex-col items-center justify-center gap-3">
            <AlertCircle className="w-8 h-8 text-zinc-600" />
            <h4 className="text-sm font-semibold text-white">No Models Found</h4>
            <p className="text-xs text-zinc-500 max-w-sm">No models match your current search constraints. Try clearing your filter criteria or choosing "All".</p>
          </div>
        )}
      </div>

    </div>
  );
}
