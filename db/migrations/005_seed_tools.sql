-- db/migrations/005_seed_tools.sql

INSERT INTO tool_definitions (name, description, input_schema, output_schema, risk_level, enabled) VALUES
('memory.save', 'Save explicit fact/preference', '{"type":"object","properties":{"content":{"type":"string"}},"required":["content"]}', '{"type":"object","properties":{"id":{"type":"string"}}}', 'low', true),
('task.create', 'Create a one-time task', '{"type":"object","properties":{"title":{"type":"string"}},"required":["title"]}', '{"type":"object","properties":{"id":{"type":"string"}}}', 'medium', true),
('automation.create', 'Create recurring job', '{"type":"object","properties":{"name":{"type":"string"}},"required":["name"]}', '{"type":"object","properties":{"id":{"type":"string"}}}', 'medium', true),
('web.search', 'Search the internet', '{"type":"object","properties":{"query":{"type":"string"}},"required":["query"]}', '{"type":"object","properties":{"results":{"type":"array"}}}', 'medium', true)
ON CONFLICT (name) DO NOTHING;
