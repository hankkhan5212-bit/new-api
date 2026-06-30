import React, { useState, useEffect, useRef } from "react";
import { Model, ChatMessage } from "../types";
import { 
  Play, 
  RotateCcw, 
  Copy, 
  Check, 
  Terminal, 
  Layers, 
  MessageSquare, 
  Trash2, 
  Plus, 
  Info, 
  Send,
  CodeXml,
  Activity,
  User,
  Bot
} from "lucide-react";

interface ConsolePlaygroundProps {
  models: Model[];
  selectedModelId: string;
  onModelChange: (modelId: string) => void;
}

export default function ConsolePlayground({ 
  models, 
  selectedModelId,
  onModelChange
}: ConsolePlaygroundProps) {
  
  // States
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "1", role: "system", content: "You are a helpful OpenRouter developer portal assistant. Always provide concise and precise answers." },
    { id: "2", role: "user", content: "Compare the prompt token cost between Gemini 2.5 and GPT-4o." }
  ]);
  const [newMessage, setNewMessage] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(800);
  const [isLoading, setIsLoading] = useState(false);
  const [activePlaygroundTab, setActivePlaygroundTab] = useState<"code" | "req" | "res">("code");
  const [selectedLanguage, setSelectedLanguage] = useState<"curl" | "python" | "js" | "go">("curl");
  const [lastResponseJson, setLastResponseJson] = useState<any>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Handle send request
  const handleSendRequest = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: selectedModelId,
          messages: messages,
          temperature: temperature,
          max_tokens: maxTokens,
        })
      });

      const data = await response.json();
      setLastResponseJson(data);

      if (data.choices && data.choices[0]?.message) {
        setMessages(prev => [
          ...prev,
          {
            id: Math.random().toString(36).substring(7),
            role: "assistant",
            content: data.choices[0].message.content
          }
        ]);
        setActivePlaygroundTab("res");
      }
    } catch (err) {
      console.error("Error during completion simulation:", err);
      // fallback manual error visualizer
      setLastResponseJson({
        error: {
          message: "Internal sandbox route error. Check developer tools console logs.",
          type: "sandbox_internal_error",
          code: "server_offline"
        }
      });
      setActivePlaygroundTab("res");
    } finally {
      setIsLoading(false);
    }
  };

  // Add a manual message frame
  const handleAddMessage = (role: "user" | "assistant" | "system") => {
    if (!newMessage.trim()) return;
    setMessages(prev => [
      ...prev,
      {
        id: Math.random().toString(36).substring(7),
        role,
        content: newMessage.trim()
      }
    ]);
    setNewMessage("");
  };

  const removeMessage = (id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id));
  };

  const clearChat = () => {
    setMessages([
      { id: "1", role: "system", content: "You are a helpful helper." }
    ]);
    setLastResponseJson(null);
  };

  // Generate live headers
  const getPayloadString = () => {
    return JSON.stringify({
      model: selectedModelId,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      temperature: temperature,
      max_tokens: maxTokens
    }, null, 2);
  };

  // Generate code dynamic snippet
  const getLanguageSnippet = () => {
    const payload = {
      model: selectedModelId,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      temperature: temperature,
      max_tokens: maxTokens
    };

    switch (selectedLanguage) {
      case "curl":
        return `curl https://openrouter.ai/api/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \\
  -H "HTTP-Referer: https://your-domain.com" \\
  -H "X-Title: Sandbox App" \\
  -d '${JSON.stringify(payload, null, 2).replace(/'/g, "'\\''")}'`;

      case "python":
        return `import requests
import json

url = "https://openrouter.ai/api/v1/chat/completions"
headers = {
    "Authorization": "Bearer $OPENROUTER_API_KEY",
    "Content-Type": "application/json"
}
data = ${JSON.stringify(payload, null, 4)}

response = requests.post(url, headers=headers, json=data)
print(response.json())`;

      case "js":
        return `const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": "Bearer $OPENROUTER_API_KEY",
    "Content-Type": "application/json",
    "HTTP-Referer": "https://your-domain.com",
    "X-Title": "My App"
  },
  body: JSON.stringify(${JSON.stringify(payload, null, 4)})
});

const data = await response.json();
console.log(data);`;

      case "go":
        return `package main

import (
\t"bytes"
\t"encoding/json"
\t"fmt"
\t"net/http"
\t"io/ioutil"
)

func main() {
\turl := "https://openrouter.ai/api/v1/chat/completions"
\tpayloadBytes, _ := json.Marshal(map[string]interface{}{
\t\t"model": "${selectedModelId}",
\t\t"messages": []map[string]string{
\t\t\t{"role": "user", "content": "Explain quantum theory"},
\t\t},
\t\t"temperature": ${temperature},
\t})

\treq, _ := http.NewRequest("POST", url, bytes.NewBuffer(payloadBytes))
\treq.Header.Set("Authorization", "Bearer $OPENROUTER_API_KEY")
\treq.Header.Set("Content-Type", "application/json")

\tclient := &http.Client{}
\tresp, _ := client.Do(req)
\tdefer resp.Body.Close()

\tbody, _ := ioutil.ReadAll(resp.Body)
\tfmt.Println(string(body))
}`;
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(getLanguageSnippet());
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      
      {/* Left part: Chat builder and Console, occupies 7 cols on large, 12 on mobile */}
      <div className="lg:col-span-7 bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col h-[680px]">
        
        {/* Header control toolbar */}
        <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-md">
              <Terminal className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Playground Console</h3>
              <p className="text-[10px] text-zinc-500 font-mono">POST /api/chat</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-[10px] text-zinc-500 uppercase font-bold mr-1">Model Preset:</label>
            <select
              value={selectedModelId}
              onChange={(e) => onModelChange(e.target.value)}
              className="px-2.5 py-1 text-xs bg-zinc-950 border border-zinc-800 rounded-md text-zinc-300 font-semibold focus:outline-none focus:border-emerald-500"
              id="select-playground-model"
            >
              {models.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>

            <button 
              onClick={clearChat}
              className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-800/60 rounded-md transition cursor-pointer"
              title="Reset Chat History"
              id="btn-clear-chat"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Message visual flow box */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3.5 scrollbar-thin select-text bg-zinc-950/40">
          
          <div className="p-3.5 rounded-lg bg-zinc-900/30 border border-zinc-800/60 text-[11px] text-zinc-500 flex items-start gap-2">
            <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Add multiple conversation nodes to construct a complete prompt history. Change roles on-the-fly to test custom conversational patterns. If the target model starts with <code className="text-zinc-300 bg-zinc-900 px-1 py-0.5 rounded">google</code>, we query live Gemini 3.5 Flash server-side.
            </p>
          </div>

          {messages.map((message) => {
            const isSystem = message.role === "system";
            const isAssistant = message.role === "assistant";
            return (
              <div 
                key={message.id} 
                className={`flex gap-3 items-start p-3.5 rounded-xl border transition ${
                  isSystem 
                    ? "bg-zinc-900/40 border-zinc-800/80" 
                    : isAssistant 
                    ? "bg-emerald-500/5 border-emerald-500/10" 
                    : "bg-blue-500/5 border-blue-500/10"
                }`}
              >
                {/* role avatar */}
                <div className={`p-1.5 rounded-lg shrink-0 ${
                  isSystem 
                    ? "bg-zinc-800 text-zinc-400" 
                    : isAssistant 
                    ? "bg-emerald-500/15 text-emerald-400" 
                    : "bg-blue-500/15 text-blue-400"
                }`}>
                  {isSystem ? (
                    <Layers className="w-3.5 h-3.5" />
                  ) : isAssistant ? (
                    <Bot className="w-3.5 h-3.5" />
                  ) : (
                    <User className="w-3.5 h-3.5" />
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      {message.role} Node
                    </span>
                    <button 
                      onClick={() => removeMessage(message.id)}
                      className="text-zinc-600 hover:text-red-400 transition cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-xs text-zinc-200 leading-relaxed font-mono whitespace-pre-wrap">
                    {message.content}
                  </p>
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex gap-3 items-start p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 animate-pulse">
              <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
                <Activity className="w-3.5 h-3.5 animate-spin" />
              </div>
              <div className="space-y-1 flex-1">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Awaiting Stream completion...</span>
                <p className="text-xs text-zinc-500">Retrieving payload from server...</p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input box to add a custom node */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/20 space-y-3">
          
          <div className="flex items-center gap-2">
            <textarea
              placeholder="Type your message payload..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleAddMessage("user");
                }
              }}
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-300 focus:outline-none focus:border-emerald-500 transition min-h-12 max-h-24 resize-none placeholder-zinc-600"
              id="playground-textarea"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Quick action buttons */}
            <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 p-1 rounded-lg">
              <button
                onClick={() => handleAddMessage("user")}
                disabled={!newMessage.trim()}
                className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-blue-400 hover:bg-zinc-900 rounded transition disabled:opacity-50 cursor-pointer"
                id="btn-add-user"
              >
                <Plus className="w-3 h-3" />
                <span>As User</span>
              </button>
              <button
                onClick={() => handleAddMessage("assistant")}
                disabled={!newMessage.trim()}
                className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-emerald-400 hover:bg-zinc-900 rounded transition disabled:opacity-50 cursor-pointer"
                id="btn-add-assistant"
              >
                <Plus className="w-3 h-3" />
                <span>As Assistant</span>
              </button>
              <button
                onClick={() => handleAddMessage("system")}
                disabled={!newMessage.trim()}
                className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-zinc-400 hover:bg-zinc-900 rounded transition disabled:opacity-50 cursor-pointer"
                id="btn-add-system"
              >
                <Plus className="w-3 h-3" />
                <span>As System</span>
              </button>
            </div>

            {/* Run Request Trigger */}
            <button
              onClick={handleSendRequest}
              disabled={isLoading || messages.length === 0}
              className="flex items-center gap-2 px-5 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-black font-bold text-xs rounded-xl transition shadow-[0_4px_12px_rgba(16,185,129,0.15)] cursor-pointer"
              id="btn-run-request"
            >
              <Send className="w-4 h-4" />
              <span>Send API Request</span>
            </button>
          </div>
        </div>

        {/* Sliders parameters drawer footer */}
        <div className="bg-zinc-950 px-4 py-3 border-t border-zinc-800 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-zinc-400 uppercase font-bold">
              <span>Temperature</span>
              <span className="font-mono text-emerald-400">{temperature}</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="2" 
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(Number(e.target.value))}
              className="w-full accent-emerald-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
              id="slider-playground-temp"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-zinc-400 uppercase font-bold">
              <span>Max Tokens</span>
              <span className="font-mono text-emerald-400">{maxTokens}</span>
            </div>
            <input 
              type="range" 
              min="50" 
              max="4000" 
              step="50"
              value={maxTokens}
              onChange={(e) => setMaxTokens(Number(e.target.value))}
              className="w-full accent-emerald-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
              id="slider-playground-max"
            />
          </div>
        </div>

      </div>

      {/* Right part: Output payloads, interactive headers & code tabs, occupies 5 cols */}
      <div className="lg:col-span-5 flex flex-col h-[680px] bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden">
        
        {/* Tab Header switchers */}
        <div className="bg-zinc-900 border-b border-zinc-800 flex items-center justify-between p-1">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActivePlaygroundTab("code")}
              className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-lg transition cursor-pointer ${activePlaygroundTab === "code" ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
              id="tab-playground-code"
            >
              API Code
            </button>
            <button
              onClick={() => setActivePlaygroundTab("req")}
              className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-lg transition cursor-pointer ${activePlaygroundTab === "req" ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
              id="tab-playground-req"
            >
              Request JSON
            </button>
            <button
              onClick={() => setActivePlaygroundTab("res")}
              className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-lg transition cursor-pointer ${activePlaygroundTab === "res" ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
              id="tab-playground-res"
            >
              Response JSON
            </button>
          </div>

          {activePlaygroundTab === "code" && (
            <div className="flex items-center gap-1 bg-zinc-950 p-0.5 border border-zinc-800 rounded-md">
              {(["curl", "python", "js", "go"] as const).map(lang => (
                <button
                  key={lang}
                  onClick={() => setSelectedLanguage(lang)}
                  className={`px-1.5 py-0.5 text-[9px] font-mono rounded font-bold uppercase tracking-wider transition cursor-pointer ${selectedLanguage === lang ? "bg-zinc-800 text-emerald-400" : "text-zinc-600 hover:text-zinc-400"}`}
                  id={`btn-code-lang-${lang}`}
                >
                  {lang}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tab view area */}
        <div className="flex-1 p-4 overflow-y-auto font-mono text-[11px] text-zinc-300 leading-normal bg-zinc-950 scrollbar-thin select-text">
          
          {activePlaygroundTab === "code" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-zinc-500">Ready integration snippet ({selectedLanguage})</span>
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1 px-2 py-1 bg-zinc-900 border border-zinc-800 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
                  id="btn-copy-playground-code"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy Snippet</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-x-auto text-zinc-200 select-all leading-relaxed whitespace-pre font-mono">
                {getLanguageSnippet()}
              </pre>
            </div>
          )}

          {activePlaygroundTab === "req" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-zinc-500">HTTP request payload</span>
                <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded font-mono font-bold">POST /chat/completions</span>
              </div>
              <pre className="p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-x-auto text-zinc-400 select-all leading-relaxed">
                {getPayloadString()}
              </pre>
            </div>
          )}

          {activePlaygroundTab === "res" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-zinc-500">HTTP response payload (OpenRouter Spec)</span>
                {lastResponseJson && (
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono font-bold">200 OK</span>
                )}
              </div>
              
              {lastResponseJson ? (
                <pre className="p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-x-auto text-emerald-400 select-all leading-relaxed">
                  {JSON.stringify(lastResponseJson, null, 2)}
                </pre>
              ) : (
                <div className="p-8 text-center text-zinc-600 space-y-2 flex flex-col items-center justify-center h-full">
                  <Terminal className="w-8 h-8 text-zinc-700 animate-pulse" />
                  <p className="text-xs">No response generated yet.</p>
                  <p className="text-[10px] max-w-xs leading-normal">Enter a prompt in the left console and click "Send API Request" to visualize OpenRouter's payload response.</p>
                </div>
              )}
            </div>
          )}

        </div>

        {/* HTTP Headers & Metadata Sandbox status footer */}
        <div className="bg-zinc-900 border-t border-zinc-800 p-4 space-y-2 text-[10px]">
          <span className="font-bold text-zinc-400 uppercase tracking-wider block">Sandbox Integration Headers:</span>
          <div className="space-y-1 font-mono text-zinc-500">
            <div><strong className="text-zinc-400">Content-Type:</strong> application/json</div>
            <div><strong className="text-zinc-400">Authorization:</strong> Bearer sk-or-sandbox-key-0112</div>
            <div><strong className="text-zinc-400">X-Sandbox-Mode:</strong> local-express-proxy</div>
          </div>
        </div>

      </div>

    </div>
  );
}
