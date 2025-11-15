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

