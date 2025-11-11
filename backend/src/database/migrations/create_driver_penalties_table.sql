-- Create table to track individual post-race penalties per driver session result
CREATE TABLE IF NOT EXISTS driver_penalties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_session_result_id UUID NOT NULL REFERENCES driver_session_results(id) ON DELETE CASCADE,
    seconds INTEGER NOT NULL CHECK (seconds > 0),
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_driver_penalties_driver_session_result_id
    ON driver_penalties(driver_session_result_id);

