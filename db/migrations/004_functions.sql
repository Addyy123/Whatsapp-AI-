-- db/migrations/004_functions.sql

CREATE OR REPLACE FUNCTION claim_automation_run(p_worker_id TEXT)
RETURNS SETOF automation_runs AS $$
  UPDATE automation_runs
  SET
    status    = 'claimed',
    worker_id = p_worker_id,
    attempt_count = attempt_count + 1
  WHERE id = (
    SELECT id
    FROM automation_runs
    WHERE status = 'pending'
    ORDER BY scheduled_for ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
$$ LANGUAGE SQL;
