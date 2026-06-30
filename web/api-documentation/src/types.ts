export interface Model {
  id: string;
  name: string;
  description: string;
  contextLength: number;
  pricing: {
    prompt: string;
    completion: string;
  };
  moderation: string;
  provider: string;
  latency: string;
  tags: string[];
}

export interface ApiEndpoint {
  id: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  name: string;
  description: string;
  headers: Array<{ name: string; required: boolean; description: string; value: string }>;
  bodyParams?: Array<{ name: string; type: string; required: boolean; description: string; default?: any; options?: string[] }>;
  responseExample: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
}
