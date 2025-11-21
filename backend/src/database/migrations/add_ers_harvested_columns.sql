-- Add ERS harvested columns to lap_times table
ALTER TABLE lap_times 
ADD COLUMN IF NOT EXISTS ers_harvested_this_lap_mguk DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS ers_harvested_this_lap_mguh DECIMAL(10,2);

