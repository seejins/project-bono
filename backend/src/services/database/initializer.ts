import { Pool, PoolClient } from 'pg';
import { Queryable } from './repositoryBase';
import { CREATE_TABLES_SQL } from './schema';

type QuerySource = Queryable | Pool | PoolClient;

export class DatabaseInitializer {
  constructor(private readonly db: QuerySource) {}

  async initialize(): Promise<void> {
    console.log('🔧 Initializing PostgreSQL database tables...');
    await this.db.query(CREATE_TABLES_SQL);
    await this.runMigrations();
    console.log('✅ PostgreSQL database initialization completed');
  }

  private async runMigrations(): Promise<void> {
    console.log('🔄 Running database migrations...');

    try {
      await this.createMigrationsTable();

      // Removed obsolete migrations - all columns are now in the base schema:
      // - add_jsonb_columns_for_session_data (additional_data already in schema)
      // - add_post_race_penalties (already in schema)
      // - add_base_race_time_ms_to_driver_session_results (already in schema)
      // - add_json_driver_columns (already in schema with indexes)
      // - add_event_name_to_tracks (already in schema)
      // - add_primary_session_result_id_to_races (column already in schema)
      // - allow_nullable_race_date (already nullable in schema)
      // - add_order_index_to_races (already in schema)
      // - add_driver_session_result_id_to_lap_times (already in schema)
      // - add_lap_analytics_columns (already in schema with indexes)
      // - add_your_driver_id_to_f123_driver_mappings (already in schema)

      // Data migration: Populate json_driver columns from existing additional_data
      await this.runMigration('populate_json_driver_columns_from_data', async () => {
        await this.db.query(`
          UPDATE driver_session_results
          SET 
            json_driver_id = (additional_data->'participantData'->>'driver-id')::INTEGER,
            json_driver_name = COALESCE(
              additional_data->>'driverName',
              additional_data->>'driver-name',
              additional_data->'participantData'->>'name'
            ),
            json_team_name = COALESCE(
              additional_data->>'team',
              additional_data->'participantData'->>'team-id'
            ),
            json_car_number = COALESCE(
              (additional_data->>'carNumber')::INTEGER,
              (additional_data->>'race-number')::INTEGER,
              (additional_data->'participantData'->>'race-number')::INTEGER
            )
          WHERE json_driver_id IS NULL 
            AND additional_data IS NOT NULL
            AND additional_data->'participantData' IS NOT NULL
        `);
      });

      // Data migration: Populate track event names
      await this.runMigration('populate_track_event_names', async () => {
        const trackEventMap: Array<[string, string, string]> = [
          ['Bahrain International Circuit', 'Bahrain Grand Prix', 'Bahrain GP'],
          ['Jeddah Corniche Circuit', 'Saudi Arabian Grand Prix', 'Saudi Arabian GP'],
          ['Albert Park Circuit', 'Australian Grand Prix', 'Australian GP'],
          ['Shanghai International Circuit', 'Chinese Grand Prix', 'Chinese GP'],
          ['Baku City Circuit', 'Azerbaijan Grand Prix', 'Azerbaijan GP'],
          ['Miami International Autodrome', 'Miami Grand Prix', 'Miami GP'],
          ['Circuit de Monaco', 'Monaco Grand Prix', 'Monaco GP'],
          ['Circuit de Barcelona-Catalunya', 'Spanish Grand Prix', 'Spanish GP'],
          ['Circuit Gilles Villeneuve', 'Canadian Grand Prix', 'Canadian GP'],
          ['Red Bull Ring', 'Austrian Grand Prix', 'Austrian GP'],
          ['Silverstone Circuit', 'British Grand Prix', 'British GP'],
          ['Hungaroring', 'Hungarian Grand Prix', 'Hungarian GP'],
          ['Spa-Francorchamps', 'Belgian Grand Prix', 'Belgian GP'],
          ['Zandvoort', 'Dutch Grand Prix', 'Dutch GP'],
          ['Monza', 'Italian Grand Prix', 'Italian GP'],
          ['Marina Bay Street Circuit', 'Singapore Grand Prix', 'Singapore GP'],
          ['Suzuka Circuit', 'Japanese Grand Prix', 'Japanese GP'],
          ['Lusail International Circuit', 'Qatar Grand Prix', 'Qatar GP'],
          ['Circuit of the Americas', 'United States Grand Prix', 'United States GP'],
          ['Autódromo Hermanos Rodríguez', 'Mexico City Grand Prix', 'Mexico City GP'],
          ['Interlagos', 'São Paulo Grand Prix', 'São Paulo GP'],
          ['Las Vegas Strip Circuit', 'Las Vegas Grand Prix', 'Las Vegas GP'],
          ['Yas Marina Circuit', 'Abu Dhabi Grand Prix', 'Abu Dhabi GP'],
        ];

        for (const [trackName, eventName, shortName] of trackEventMap) {
          await this.db.query(
            `UPDATE tracks
             SET event_name = $2,
                 short_event_name = $3
             WHERE name = $1
               AND (event_name IS DISTINCT FROM $2 OR short_event_name IS DISTINCT FROM $3)`,
            [trackName, eventName, shortName],
          );
        }
      });

      // Seed all F1 2023/2024 tracks
      await this.runMigration('seed_f1_tracks', async () => {
        const tracks = [
          { name: 'Bahrain International Circuit', country: 'Bahrain', length: 5.412, eventName: 'Bahrain Grand Prix', shortEventName: 'Bahrain GP' },
          { name: 'Jeddah Corniche Circuit', country: 'Saudi Arabia', length: 6.174, eventName: 'Saudi Arabian Grand Prix', shortEventName: 'Saudi Arabian GP' },
          { name: 'Albert Park Circuit', country: 'Australia', length: 5.303, eventName: 'Australian Grand Prix', shortEventName: 'Australian GP' },
          { name: 'Shanghai International Circuit', country: 'China', length: 5.451, eventName: 'Chinese Grand Prix', shortEventName: 'Chinese GP' },
          { name: 'Baku City Circuit', country: 'Azerbaijan', length: 6.003, eventName: 'Azerbaijan Grand Prix', shortEventName: 'Azerbaijan GP' },
          { name: 'Miami International Autodrome', country: 'USA', length: 5.412, eventName: 'Miami Grand Prix', shortEventName: 'Miami GP' },
          { name: 'Autodromo Enzo e Dino Ferrari', country: 'Italy', length: 4.909, eventName: 'Emilia Romagna Grand Prix', shortEventName: 'Emilia Romagna GP' },
          { name: 'Circuit de Monaco', country: 'Monaco', length: 3.337, eventName: 'Monaco Grand Prix', shortEventName: 'Monaco GP' },
          { name: 'Circuit de Barcelona-Catalunya', country: 'Spain', length: 4.675, eventName: 'Spanish Grand Prix', shortEventName: 'Spanish GP' },
          { name: 'Circuit Gilles Villeneuve', country: 'Canada', length: 4.361, eventName: 'Canadian Grand Prix', shortEventName: 'Canadian GP' },
          { name: 'Red Bull Ring', country: 'Austria', length: 4.318, eventName: 'Austrian Grand Prix', shortEventName: 'Austrian GP' },
          { name: 'Silverstone Circuit', country: 'United Kingdom', length: 5.891, eventName: 'British Grand Prix', shortEventName: 'British GP' },
          { name: 'Hungaroring', country: 'Hungary', length: 4.381, eventName: 'Hungarian Grand Prix', shortEventName: 'Hungarian GP' },
          { name: 'Circuit de Spa-Francorchamps', country: 'Belgium', length: 7.004, eventName: 'Belgian Grand Prix', shortEventName: 'Belgian GP' },
          { name: 'Circuit Zandvoort', country: 'Netherlands', length: 4.259, eventName: 'Dutch Grand Prix', shortEventName: 'Dutch GP' },
          { name: 'Autodromo Nazionale Monza', country: 'Italy', length: 5.793, eventName: 'Italian Grand Prix', shortEventName: 'Italian GP' },
          { name: 'Marina Bay Street Circuit', country: 'Singapore', length: 5.063, eventName: 'Singapore Grand Prix', shortEventName: 'Singapore GP' },
          { name: 'Suzuka International Racing Course', country: 'Japan', length: 5.807, eventName: 'Japanese Grand Prix', shortEventName: 'Japanese GP' },
          { name: 'Lusail International Circuit', country: 'Qatar', length: 5.380, eventName: 'Qatar Grand Prix', shortEventName: 'Qatar GP' },
          { name: 'Circuit of the Americas', country: 'USA', length: 5.513, eventName: 'United States Grand Prix', shortEventName: 'United States GP' },
          { name: 'Autodromo Hermanos Rodriguez', country: 'Mexico', length: 4.304, eventName: 'Mexico City Grand Prix', shortEventName: 'Mexico City GP' },
          { name: 'Autodromo Jose Carlos Pace', country: 'Brazil', length: 4.309, eventName: 'São Paulo Grand Prix', shortEventName: 'São Paulo GP' },
          { name: 'Las Vegas Street Circuit', country: 'USA', length: 6.120, eventName: 'Las Vegas Grand Prix', shortEventName: 'Las Vegas GP' },
          { name: 'Yas Marina Circuit', country: 'UAE', length: 5.281, eventName: 'Abu Dhabi Grand Prix', shortEventName: 'Abu Dhabi GP' },
        ];

        for (const track of tracks) {
          // Check if track already exists (by name)
          const existing = await this.db.query(
            'SELECT id FROM tracks WHERE name = $1',
            [track.name],
          );

          if (existing.rows.length === 0) {
            // Insert new track
            await this.db.query(
              `INSERT INTO tracks (id, name, country, length_km, event_name, short_event_name, created_at)
               VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
              [track.name, track.country, track.length, track.eventName, track.shortEventName],
            );
          } else {
            // Update existing track with event names if missing
            await this.db.query(
              `UPDATE tracks
               SET event_name = COALESCE(NULLIF(event_name, ''), $2),
                   short_event_name = COALESCE(NULLIF(short_event_name, ''), $3),
                   country = CASE WHEN country = 'Unknown' THEN $4 ELSE country END,
                   length_km = CASE WHEN length_km = 0 THEN $5 ELSE length_km END
               WHERE name = $1`,
              [track.name, track.eventName, track.shortEventName, track.country, track.length],
            );
          }
        }
      });

      // Add foreign key constraint for primary_session_result_id (circular dependency resolved)
      await this.runMigration('add_primary_session_result_id_foreign_key', async () => {
        await this.db.query(`
          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1
              FROM pg_constraint
              WHERE conname = 'races_primary_session_result_id_fkey'
            ) THEN
              ALTER TABLE races
              ADD CONSTRAINT races_primary_session_result_id_fkey
              FOREIGN KEY (primary_session_result_id)
              REFERENCES session_results(id)
              ON DELETE SET NULL;
            END IF;
          END $$;
        `);

        await this.db.query(`
          CREATE INDEX IF NOT EXISTS idx_races_primary_session_result_id
            ON races(primary_session_result_id)
        `);
      });

      // Data migration: Set order_index for existing races
      await this.runMigration('populate_race_order_index', async () => {
        await this.db.query(`
          WITH ordered AS (
            SELECT
              id,
              season_id,
              ROW_NUMBER() OVER (
                PARTITION BY season_id
                ORDER BY
                  COALESCE(race_date, created_at)
              ) AS rn
            FROM races
          )
          UPDATE races r
          SET order_index = ordered.rn
          FROM ordered
          WHERE r.id = ordered.id
            AND (r.order_index IS NULL OR r.order_index = 0)
        `);
      });

      // Data migration: Populate driver_session_result_id in edit_history for existing records
      await this.runMigration('populate_edit_history_driver_session_result_id', async () => {
        await this.db.query(`
          UPDATE race_edit_history reh
          SET driver_session_result_id = (
            SELECT dsr.id
            FROM driver_session_results dsr
            WHERE dsr.session_result_id = reh.session_result_id
              AND (
                (reh.user_id IS NOT NULL AND dsr.user_id = reh.user_id) OR
                (reh.user_id IS NULL 
                 AND reh.old_value->>'driver_id' IS NOT NULL
                 AND (dsr.additional_data->'participantData'->>'driver-id')::text = reh.old_value->>'driver_id')
              )
            LIMIT 1
          )
          WHERE driver_session_result_id IS NULL
            AND reh.session_result_id IS NOT NULL
        `);
      });

      // Add missing indexes for query optimization
      await this.runMigration('add_missing_indexes', async () => {
        // Index on driver_session_results.session_result_id (most common query pattern)
        await this.db.query(`
          CREATE INDEX IF NOT EXISTS idx_driver_session_results_session_result_id 
          ON driver_session_results(session_result_id)
        `);

        // Index on session_results.race_id (common query pattern)
        await this.db.query(`
          CREATE INDEX IF NOT EXISTS idx_session_results_race_id 
          ON session_results(race_id)
        `);

        // Composite index on session_results(race_id, session_type) for WHERE race_id = $1 AND session_type = X patterns
        await this.db.query(`
          CREATE INDEX IF NOT EXISTS idx_session_results_race_id_session_type 
          ON session_results(race_id, session_type)
        `);

        // Composite index on driver_session_results(session_result_id, json_driver_id)
        await this.db.query(`
          CREATE INDEX IF NOT EXISTS idx_driver_session_results_session_result_id_json_driver_id 
          ON driver_session_results(session_result_id, json_driver_id)
        `);
      });

      // Add ERS harvested columns to lap_times table
      await this.runMigration('add_ers_harvested_columns', async () => {
        await this.db.query(`
          ALTER TABLE lap_times 
          ADD COLUMN IF NOT EXISTS ers_harvested_this_lap_mguk DECIMAL(10,2),
          ADD COLUMN IF NOT EXISTS ers_harvested_this_lap_mguh DECIMAL(10,2);
        `);
      });

      console.log('✅ Database migrations completed');
    } catch (error) {
      console.error('❌ Migration error:', error);
      throw error;
    }
  }

  private async createMigrationsTable(): Promise<void> {
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  private async runMigration(migrationName: string, migrationFunction: () => Promise<void>): Promise<void> {
    try {
      const hasRun = await this.hasMigrationRun(migrationName);
      if (hasRun) {
        console.log(`⏭️ Migration ${migrationName} already executed, skipping`);
        return;
      }

      console.log(`🔄 Running migration: ${migrationName}`);
      await migrationFunction();
      await this.markMigrationAsRun(migrationName);
      console.log(`✅ Migration ${migrationName} completed`);
    } catch (error) {
      console.error(`❌ Migration ${migrationName} failed:`, error);
      throw error;
    }
  }

  private async hasMigrationRun(migrationName: string): Promise<boolean> {
    const result = await this.db.query('SELECT 1 FROM migrations WHERE name = $1', [migrationName]);
    return result.rows.length > 0;
  }

  private async markMigrationAsRun(migrationName: string): Promise<void> {
    try {
      await this.db.query('INSERT INTO migrations (name) VALUES ($1)', [migrationName]);
    } catch (error: any) {
      if (error.code === '23505') {
        console.log(`✅ Migration ${migrationName} was already recorded`);
        return;
      }
      throw error;
    }
  }

  private async addColumnIfNotExists(tableName: string, columnName: string, columnDefinition: string): Promise<void> {
    try {
      const checkQuery = `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = $1 AND column_name = $2
      `;
      const result = await this.db.query(checkQuery, [tableName, columnName]);

      if (result.rows.length === 0) {
        console.log(`📝 Adding column ${columnName} to ${tableName} table`);
        await this.db.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
      }
    } catch (error) {
      console.error(`Error adding column ${columnName} to ${tableName}:`, error);
      throw error;
    }
  }
}

