-- db/migrations/006_whatsapp_sessions.sql
-- Tracks WhatsApp linked-device session metadata.
-- The actual session credentials (Baileys auth files) are stored on disk
-- in the bridge's auth_store/ directory — NOT in this database.
-- This table exists for audit trails, status tracking, and connection UI.

CREATE TABLE IF NOT EXISTS whatsapp_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id        UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Current session status (mirrors SessionState enum in the bridge)
  status          TEXT NOT NULL DEFAULT 'disconnected' CHECK (
                    status IN ('disconnected', 'starting', 'qr_required',
                               'connecting', 'connected', 'reconnecting',
                               'logged_out', 'failed')
                  ),

  -- Masked phone identifier (e.g. "+91 ****1234") — never the full number
  phone_masked    TEXT,

  -- Timestamps
  connected_at    TIMESTAMPTZ,
  disconnected_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Only one active session per agent
  UNIQUE (agent_id)
);

-- Index for looking up by user
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_user_id
  ON whatsapp_sessions (user_id);

-- Audit: record all connection events
CREATE TABLE IF NOT EXISTS whatsapp_connection_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   UUID NOT NULL REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
  event_type   TEXT NOT NULL, -- 'connected', 'disconnected', 'qr_generated', 'reconnecting', 'failed', 'logged_out'
  metadata     JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
