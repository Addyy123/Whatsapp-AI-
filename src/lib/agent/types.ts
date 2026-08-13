export interface AgentRequest {
  agent_id: string;
  user_id: string;
  message: string;
  conversation_id?: string;
  source: 'dev_ui' | 'whatsapp' | 'telegram' | 'web' | 'api';
  request_id: string;
  metadata?: Record<string, unknown>;
}

export interface ActionRecord {
  type: string;
  id?: string;
  summary?: string;
}

export interface ConfirmationRequest {
  confirmation_id: string;
  tool_name: string;
  description: string;
  preview: Record<string, unknown>;
  expires_at: string;
}

export interface AgentResponse {
  run_id: string;
  status: 'completed' | 'failed' | 'confirmation_required';
  reply: string;
  actions: ActionRecord[];
  confirmation?: ConfirmationRequest;
  tokens_in?: number;
  tokens_out?: number;
  duration_ms?: number;
}

export interface Agent {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  status: string;
}

export interface AgentConfig {
  id: string;
  agent_id: string;
  response_style: string;
  timezone: string;
  locale: string;
  autonomy_level: number;
  enabled_tools: string[];
  confirmation_policy: Record<string, unknown>;
  allowed_recipients: string[];
  model_policy: Record<string, unknown>;
  memory_policy: Record<string, unknown>;
  automation_policy: Record<string, unknown>;
}

export interface Conversation {
  id: string;
  agent_id: string;
  user_id: string;
  channel_source: string;
  metadata: Record<string, unknown>;
}
