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

      await this.runMigration('add_steam_id_to_members', async () => {
        await this.addColumnIfNotExists('members', 'steam_id', 'VARCHAR(20) UNIQUE');
      });

      await this.runMigration('add_jsonb_columns_for_session_data', async () => {
        await this.addColumnIfNotExists('session_results', 'additional_data', 'JSONB');
        await this.addColumnIfNotExists('driver_session_results', 'additional_data', 'JSONB');
      });

      await this.runMigration('add_post_race_penalties', async () => {
        await this.addColumnIfNotExists('driver_session_results', 'post_race_penalties', 'INTEGER DEFAULT 0');
        await this.addColumnIfNotExists('driver_session_results', 'base_race_time_ms', 'INTEGER');
        await this.addColumnIfNotExists(
          'driver_session_results',
          'updated_at',
          'TIMESTAMP WITH TIME ZONE DEFAULT NOW()'
        );
      });

      await this.runMigration('add_base_race_time_ms_to_driver_session_results', async () => {
        await this.addColumnIfNotExists('driver_session_results', 'base_race_time_ms', 'INTEGER');
      });

      await this.runMigration('allow_null_driver_id_in_edit_history', async () => {
        const columnInfo = await this.db.query(
          `SELECT column_name, is_nullable 
           FROM information_schema.columns 
           WHERE table_name = 'race_edit_history' AND column_name = 'driver_id'`
        );

        if (columnInfo.rows.length > 0) {
          await this.db.query(`
            ALTER TABLE race_edit_history 
            DROP CONSTRAINT IF EXISTS race_edit_history_driver_id_fkey
          `);

          if (columnInfo.rows[0].is_nullable === 'NO') {
            await this.db.query(`
              ALTER TABLE race_edit_history 
              ALTER COLUMN driver_id DROP NOT NULL
            `);
          }

          await this.db.query(`
            ALTER TABLE race_edit_history 
            ADD CONSTRAINT race_edit_history_driver_id_fkey 
            FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL
          `);
        }
      });

      await this.runMigration('fix_seasons_nullable_dates', async () => {
        await this.db.query('ALTER TABLE seasons ALTER COLUMN start_date DROP NOT NULL');
        await this.db.query('ALTER TABLE seasons ALTER COLUMN end_date DROP NOT NULL');
      });

      await this.runMigration('add_your_driver_id_to_f123_driver_mappings', async () => {
        await this.addColumnIfNotExists(
          'f123_driver_mappings',
          'your_driver_id',
          'UUID REFERENCES drivers(id) ON DELETE CASCADE'
        );
      });

      await this.runMigration('add_json_driver_columns', async () => {
        await this.addColumnIfNotExists('driver_session_results', 'json_driver_id', 'INTEGER');
        await this.addColumnIfNotExists('driver_session_results', 'json_driver_name', 'VARCHAR(100)');
        await this.addColumnIfNotExists('driver_session_results', 'json_team_name', 'VARCHAR(100)');
        await this.addColumnIfNotExists('driver_session_results', 'json_car_number', 'INTEGER');

        await this.db.query(`
          CREATE INDEX IF NOT EXISTS idx_driver_session_results_json_driver_id 
          ON driver_session_results(json_driver_id)
        `);
        await this.db.query(`
          CREATE INDEX IF NOT EXISTS idx_driver_session_results_json_driver_name 
          ON driver_session_results(json_driver_name)
        `);

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

      await this.runMigration('add_event_name_to_tracks', async () => {
        await this.addColumnIfNotExists('tracks', 'event_name', 'VARCHAR(120)');
        await this.addColumnIfNotExists('tracks', 'short_event_name', 'VARCHAR(60)');

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

      await this.runMigration('add_primary_session_result_id_to_races', async () => {
        await this.addColumnIfNotExists('races', 'primary_session_result_id', 'UUID');

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

      await this.runMigration('allow_nullable_race_date', async () => {
        await this.db.query(`
          ALTER TABLE races
          ALTER COLUMN race_date DROP NOT NULL
        `);
      });

      await this.runMigration('add_order_index_to_races', async () => {
        await this.addColumnIfNotExists('races', 'order_index', 'INTEGER');

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

      await this.runMigration('add_driver_session_result_id_to_edit_history', async () => {
        await this.addColumnIfNotExists(
          'race_edit_history',
          'driver_session_result_id',
          'UUID REFERENCES driver_session_results(id) ON DELETE CASCADE'
        );

        await this.db.query(`
          CREATE INDEX IF NOT EXISTS idx_race_edit_history_driver_session_result_id 
          ON race_edit_history(driver_session_result_id)
        `);

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

      await this.runMigration('add_driver_session_result_id_to_lap_times', async () => {
        await this.addColumnIfNotExists('lap_times', 'driver_session_result_id', 'UUID');

        await this.db.query(`
          CREATE INDEX IF NOT EXISTS idx_lap_times_driver_session_result_id 
          ON lap_times(driver_session_result_id)
        `);

        await this.db.query(`
          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM pg_constraint 
              WHERE conname = 'lap_times_driver_session_result_id_fkey'
            ) THEN
              ALTER TABLE lap_times
              ADD CONSTRAINT lap_times_driver_session_result_id_fkey
              FOREIGN KEY (driver_session_result_id)
              REFERENCES driver_session_results(id)
              ON DELETE CASCADE;
            END IF;
          END $$;
        `);
      });

      await this.runMigration('add_lap_analytics_columns', async () => {
        await this.addColumnIfNotExists('lap_times', 'sector1_time_minutes', 'INTEGER');
        await this.addColumnIfNotExists('lap_times', 'sector2_time_minutes', 'INTEGER');
        await this.addColumnIfNotExists('lap_times', 'sector3_time_minutes', 'INTEGER');
        await this.addColumnIfNotExists('lap_times', 'lap_valid_bit_flags', 'INTEGER');
        await this.addColumnIfNotExists('lap_times', 'track_position', 'INTEGER');
        await this.addColumnIfNotExists('lap_times', 'tire_age_laps', 'INTEGER');
        await this.addColumnIfNotExists('lap_times', 'top_speed_kmph', 'INTEGER');
        await this.addColumnIfNotExists('lap_times', 'max_safety_car_status', 'VARCHAR(50)');
        await this.addColumnIfNotExists('lap_times', 'vehicle_fia_flags', 'VARCHAR(50)');
        await this.addColumnIfNotExists('lap_times', 'pit_stop', 'BOOLEAN DEFAULT FALSE');
        await this.addColumnIfNotExists('lap_times', 'ers_store_energy', 'DECIMAL(10,2)');
        await this.addColumnIfNotExists('lap_times', 'ers_deployed_this_lap', 'DECIMAL(10,2)');
        await this.addColumnIfNotExists('lap_times', 'ers_deploy_mode', 'VARCHAR(50)');
        await this.addColumnIfNotExists('lap_times', 'fuel_in_tank', 'DECIMAL(10,2)');
        await this.addColumnIfNotExists('lap_times', 'fuel_remaining_laps', 'DECIMAL(10,2)');
        await this.addColumnIfNotExists('lap_times', 'gap_to_leader_ms', 'INTEGER');
        await this.addColumnIfNotExists('lap_times', 'gap_to_position_ahead_ms', 'INTEGER');
        await this.addColumnIfNotExists('lap_times', 'car_damage_data', 'JSONB');
        await this.addColumnIfNotExists('lap_times', 'tyre_sets_data', 'JSONB');

        await this.db.query(`
          CREATE INDEX IF NOT EXISTS idx_lap_times_track_position 
          ON lap_times(track_position)
        `);
        await this.db.query(`
          CREATE INDEX IF NOT EXISTS idx_lap_times_tire_compound 
          ON lap_times(tire_compound)
        `);
        await this.db.query(`
          CREATE INDEX IF NOT EXISTS idx_lap_times_pit_stop 
          ON lap_times(pit_stop)
        `);
        await this.db.query(`
          CREATE INDEX IF NOT EXISTS idx_lap_times_lap_number 
          ON lap_times(lap_number)
        `);
      });

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

        // Ensure lap_times indexes exist (may already exist, but ensure they do)
        await this.db.query(`
          CREATE INDEX IF NOT EXISTS idx_lap_times_driver_session_result_id 
          ON lap_times(driver_session_result_id)
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

