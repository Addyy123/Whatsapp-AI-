-- db/migrations/001_initial_schema.sql

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  display_name  TEXT,
  timezone      TEXT NOT NULL DEFAULT 'UTC',
  locale        TEXT NOT NULL DEFAULT 'en',
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE agents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL DEFAULT 'Agent',
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'deleted')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE agent_configs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id            UUID UNIQUE NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  response_style      TEXT NOT NULL DEFAULT 'conversational' CHECK (response_style IN ('concise', 'detailed', 'conversational')),
  timezone            TEXT NOT NULL DEFAULT 'UTC',
  locale              TEXT NOT NULL DEFAULT 'en',
  autonomy_level      INTEGER NOT NULL DEFAULT 1 CHECK (autonomy_level BETWEEN 0 AND 3),
  enabled_tools       TEXT[] NOT NULL DEFAULT '{}',
  confirmation_policy JSONB NOT NULL DEFAULT '{ "high_risk": "always", "destructive": "always", "send_to_new_recipient": true }',
  allowed_recipients  TEXT[] NOT NULL DEFAULT '{}',
  daily_action_limits JSONB NOT NULL DEFAULT '{}',
  model_policy        JSONB NOT NULL DEFAULT '{ "provider": "groq", "model": "llama-3.3-70b-versatile", "max_tokens": 4096, "temperature": 0.3, "max_iterations": 10, "context_window_messages": 20 }',
  memory_policy       JSONB NOT NULL DEFAULT '{ "auto_save": false, "search_limit": 10, "search_threshold": 0.7 }',
  automation_policy   JSONB NOT NULL DEFAULT '{ "max_active": 50, "default_timezone": "UTC", "max_daily_executions": 100 }',
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id        UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel_source  TEXT NOT NULL DEFAULT 'dev_ui',
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE messages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  agent_id         UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  role             TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'tool_result', 'system')),
  content          TEXT NOT NULL,
  tool_call_id     TEXT,
  tool_name        TEXT,
  token_count      INTEGER,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE conversation_summaries (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  summary          TEXT NOT NULL,
  message_range    INT4RANGE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE memories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id    UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  owner_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  category    TEXT,
  source      TEXT NOT NULL DEFAULT 'explicit_save',
  tags        TEXT[] NOT NULL DEFAULT '{}',
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tasks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id     UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  owner_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority     TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  due_at       TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  metadata     JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE automations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id          UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  owner_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  description       TEXT,
  trigger_type      TEXT NOT NULL CHECK (trigger_type IN ('one_time', 'cron', 'interval', 'event_inbound', 'event_email', 'event_calendar', 'event_webhook', 'condition')),
  trigger_config    JSONB NOT NULL,
  action_type       TEXT NOT NULL,
  action_config     JSONB NOT NULL,
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'error', 'deleted')),
  confirmation_policy TEXT NOT NULL DEFAULT 'never' CHECK (confirmation_policy IN ('never', 'once', 'always')),
  next_run_at       TIMESTAMPTZ,
  last_run_at       TIMESTAMPTZ,
  last_run_status   TEXT,
  run_count         INTEGER NOT NULL DEFAULT 0,
  natural_language  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE automation_runs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
  execution_id  TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  started_at    TIMESTAMPTZ,
  finished_at   TIMESTAMPTZ,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'running', 'succeeded', 'failed', 'retrying', 'skipped')),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  result        JSONB,
  error_message TEXT,
  error_code    TEXT,
  worker_id     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(automation_id, execution_id)
);

CREATE TABLE agent_runs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id       TEXT UNIQUE NOT NULL,
  agent_id         UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id  UUID REFERENCES conversations(id),
  source           TEXT NOT NULL,
  input_message    TEXT NOT NULL,
  output_reply     TEXT,
  status           TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'confirmation_required')),
  tool_calls       JSONB NOT NULL DEFAULT '[]',
  actions          JSONB NOT NULL DEFAULT '[]',
  tokens_in        INTEGER,
  tokens_out       INTEGER,
  duration_ms      INTEGER,
  error_message    TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at     TIMESTAMPTZ
);

CREATE TABLE tool_definitions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT UNIQUE NOT NULL,
  version             TEXT NOT NULL DEFAULT '1.0',
  description         TEXT NOT NULL,
  input_schema        JSONB NOT NULL,
  output_schema       JSONB NOT NULL,
  risk_level          TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'destructive')),
  requires_connection TEXT,
  enabled             BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE agent_tools (
  agent_id    UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  tool_id     UUID NOT NULL REFERENCES tool_definitions(id) ON DELETE CASCADE,
  scopes      TEXT[] NOT NULL DEFAULT '{}',
  config      JSONB NOT NULL DEFAULT '{}',
  status      TEXT NOT NULL DEFAULT 'enabled' CHECK (status IN ('enabled', 'disabled')),
  granted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (agent_id, tool_id)
);

CREATE TABLE connections (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id          UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  provider          TEXT NOT NULL,
  account_reference TEXT,
  scopes            TEXT[] NOT NULL DEFAULT '{}',
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked', 'error')),
  connected_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at        TIMESTAMPTZ,
  UNIQUE(agent_id, provider)
);

CREATE TABLE secure_tokens (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id    UUID NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
  encrypted_token  TEXT NOT NULL,
  token_type       TEXT NOT NULL,
  expires_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id    UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  actor_id    UUID,
  actor_type  TEXT NOT NULL,
  event_type  TEXT NOT NULL,
  metadata    JSONB NOT NULL DEFAULT '{}',
  ip_address  INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE idempotency_keys (
  key               TEXT NOT NULL,
  scope             TEXT NOT NULL,
  result_reference  UUID,
  result_status     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at        TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '24 hours',
  PRIMARY KEY (key, scope)
);
