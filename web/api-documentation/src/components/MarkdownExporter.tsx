import React, { useState } from "react";
import { Copy, Check, Download, FileText, CheckCircle } from "lucide-react";

export default function MarkdownExporter() {
  const [copied, setCopied] = useState(false);

  const markdownContent = `# OpenRouter & NewAPI Unified API Specification
## Seamless LLM Integration for Developers

Welcome to the OpenRouter developer integration suite. This document outlines the unified payload standard, authentication guidelines, and routing schemas to connect your application seamlessly with dozens of frontier models including Gemini, GPT, Claude, and open-weight models.

---

### 1. Base URL & Network Security

All API communication must be encrypted via TLS/HTTPS. 

| Environment | Endpoint URI | Purpose |
| :--- | :--- | :--- |
| **Production API** | \`https://openrouter.ai/api/v1\` | High-concurrency production deployments |
| **Sandbox API** | \`/api\` | Local development and integration testing |

---

### 2. Authentication

Authentication is managed via HTTP Header tokens. Acquire your secret keys from your API developer dashboard.

\`\`\`http
Authorization: Bearer YOUR_OPENROUTER_API_KEY
HTTP-Referer: https://your-domain.com
X-Title: Your Application Name
\`\`\`

*Note: Passing \`HTTP-Referer\` and \`X-Title\` is highly recommended. It allows OpenRouter to attribute your application in analytics, leaderboard rankings, and active developer widgets.*

---

### 3. Create Chat Completion

Submit an array of structured chat history frames to get a tokenized streaming or static assistant completion.

**HTTP Method:** \`POST\`  
**Endpoint:** \`/chat/completions\`

#### Request Headers:
- \`Content-Type: application/json\`
- \`Authorization: Bearer sk-or-...\`

#### Request JSON Payload Parameters:

| Field | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| \`model\` | *string* | **Yes** | \`google/gemini-2.5-flash\` | ID of target model (e.g. \`anthropic/claude-3-5-sonnet\`, \`openai/gpt-4o\`) |
| \`messages\` | *array* | **Yes** | \`[]\` | Ordered conversation history (System, User, Assistant messages) |
| \`temperature\` | *number* | No | \`0.7\` | Controls stochastic randomness. Range: [0.0 - 2.0] |
| \`max_tokens\` | *integer* | No | \`null\` | Maximum completion token budget per request |
| \`stream\` | *boolean* | No | \`false\` | Enable Server-Sent Events (SSE) word deltas delivery |

#### Request Payload Example:
\`\`\`json
{
  "model": "google/gemini-2.5-flash",
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful programming assistant specialized in API optimization."
    },
    {
      "role": "user",
      "content": "What is the best way to handle transient 429 rate limit errors?"
    }
  ],
  "temperature": 0.5,
  "max_tokens": 1000
}
\`\`\`

#### Response Payload Example (200 OK):
\`\`\`json
{
  "id": "chatcmpl-9f82kd9a1",
  "object": "chat.completion",
  "created": 1719651524,
  "model": "google/gemini-2.5-flash",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "To handle transient 429 rate limit errors effectively, implement an Exponential Backoff retry strategy with Jitter. This spreads out retry frequencies to prevent synchronized traffic spikes."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 32,
    "completion_tokens": 35,
    "total_tokens": 67
  }
}
\`\`\`

---

### 4. Advanced: Server-Sent Events (SSE) Stream

If \`stream\` is set to \`true\`, chunks are pushed sequentially as standard server-sent events:

\`\`\`http
data: {"choices": [{"delta": {"role": "assistant", "content": "To"}}]}
data: {"choices": [{"delta": {"content": " handle"}}]}
data: {"choices": [{"delta": {"content": " transient"}}]}
data: [DONE]
\`\`\`

---

### 5. Standard Error Envelopes

When a request fails, the API responds with a structured JSON block and proper HTTP status code.

| Status Code | Error Code | Common Cause | Mitigation |
| :--- | :--- | :--- | :--- |
| **400** | \`invalid_request\` | Malformed JSON parameters | Review payload structure against type definitions |
| **401** | \`unauthorized\` | Invalid/revoked API key | Verify key credentials in dashboard settings |
| **404** | \`model_not_found\` | Model ID not valid | Query the \`/models\` endpoint for an active listing |
| **429** | \`rate_limit_exceeded\` | Exceeded maximum concurrent calls | Implement client-side queueing or backoff retry loops |

\`\`\`json
{
  "error": {
    "message": "The requested model 'google/gemini-invalid' does not exist.",
    "type": "invalid_request_error",
    "code": "model_not_found"
  }
}
\`\`\`

---

### 6. Code Integration Snippets

#### Python integration
\`\`\`python
import requests

url = "https://openrouter.ai/api/v1/chat/completions"
headers = {
    "Authorization": "Bearer $OPENROUTER_API_KEY",
    "Content-Type": "application/json"
}
data = {
    "model": "google/gemini-2.5-flash",
    "messages": [{"role": "user", "content": "Describe AI safety guidelines"}]
}

response = requests.post(url, headers=headers, json=data)
print(response.json())
\`\`\`

#### Node.js Fetch integration
\`\`\`javascript
const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": "Bearer $OPENROUTER_API_KEY",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    model: "google/gemini-2.5-flash",
    messages: [{ role: "user", content: "Explain quantum superposition" }]
  })
});
const data = await response.json();
console.log(data);
\`\`\`
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(markdownContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([markdownContent], { type: "text/plain;charset=utf-8" });
    element.href = URL.createObjectURL(file);
    element.download = "openrouter-api-spec.md";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
      
      {/* Header toolbar */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Full Markdown Documentation</h3>
            <p className="text-[11px] text-zinc-400">Ready to copy, download or integrate directly into your projects</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition cursor-pointer"
            id="btn-copy-doc-md"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400 animate-scale-up" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Raw Markdown</span>
              </>
            )}
          </button>
          
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-xs font-medium transition cursor-pointer"
            id="btn-download-doc-md"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .md File</span>
          </button>
        </div>
      </div>

      {/* Embedded Document content */}
      <div className="p-8 max-h-[600px] overflow-y-auto font-mono text-xs text-zinc-300 leading-relaxed space-y-4 select-text selection:bg-emerald-500/20 scrollbar-thin">
        {copied && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-lg flex items-center gap-2 mb-2 animate-pulse">
            <CheckCircle className="w-4 h-4" />
            <span>Markdown payload successfully copied to clipboard! Paste it inside any markdown editor or README.md.</span>
          </div>
        )}
        <pre className="whitespace-pre-wrap font-sans text-sm tracking-wide text-zinc-300">
          {markdownContent}
        </pre>
      </div>

      {/* Quick overview note */}
      <div className="bg-zinc-900 border-t border-zinc-800 p-4 text-[11px] text-zinc-500 text-center">
        This document follows standard GitHub Flavored Markdown syntax and can be parsed by any typical Markdown renderer.
      </div>
    </div>
  );
}
