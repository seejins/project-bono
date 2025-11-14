import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

export type Queryable = Pick<Pool, 'query'> | PoolClient;

export class RepositoryBase {
  protected db: Queryable;

  constructor(protected readonly pool: Pool, db?: Queryable) {
    this.db = db ?? pool;
  }

  protected async executeQuery<T = any>(query: string, params: any[] = []): Promise<T[]> {
    const result = await this.db.query(query, params);
    return result.rows;
  }

  protected async executeUpdate(query: string, params: any[] = []): Promise<void> {
    await this.db.query(query, params);
  }
}

export class TransactionContext extends RepositoryBase {
  constructor(pool: Pool, private readonly client: PoolClient) {
    super(pool, client);
  }

  async query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    return this.client.query<T>(text, params);
  }

  async commit(): Promise<void> {
    await this.client.query('COMMIT');
  }

  async rollback(): Promise<void> {
    await this.client.query('ROLLBACK');
  }

  release(): void {
    this.client.release();
  }
}

