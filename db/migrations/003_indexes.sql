-- db/migrations/003_indexes.sql

CREATE INDEX agents_owner_id_idx ON agents(owner_id);

CREATE INDEX conversations_agent_id_idx ON conversations(agent_id);
CREATE INDEX conversations_user_id_idx  ON conversations(user_id);

CREATE INDEX messages_conversation_id_idx ON messages(conversation_id, created_at);

CREATE INDEX memories_agent_owner_idx  ON memories(agent_id, owner_id);
CREATE INDEX memories_content_fts_idx  ON memories USING GIN (to_tsvector('english', content));

CREATE INDEX tasks_agent_owner_idx   ON tasks(agent_id, owner_id);
CREATE INDEX tasks_status_due_at_idx ON tasks(status, due_at);

CREATE INDEX automations_agent_owner_idx ON automations(agent_id, owner_id);
CREATE INDEX automations_next_run_idx    ON automations(next_run_at) WHERE status = 'active';

CREATE INDEX automation_runs_status_idx     ON automation_runs(status, created_at);
CREATE INDEX automation_runs_automation_idx ON automation_runs(automation_id, created_at);

CREATE INDEX audit_logs_agent_id_idx   ON audit_logs(agent_id, created_at);
CREATE INDEX audit_logs_event_type_idx ON audit_logs(event_type, created_at);

CREATE INDEX idempotency_keys_expires_idx ON idempotency_keys(expires_at);
