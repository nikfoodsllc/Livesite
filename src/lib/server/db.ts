import { MongoClient, Db, Collection, Document, Filter, UpdateFilter, OptionalId, OptionalUnlessRequiredId } from 'mongodb';

/**
 * Database Handler Class
 * Provides a singleton MongoDB connection with basic CRUD operations
 */
class DatabaseHandler {
  private static instance: DatabaseHandler;
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private connectionPromise: Promise<void> | null = null;

  private constructor() {}

  /**
   * Get singleton instance of DatabaseHandler
   */
  public static getInstance(): DatabaseHandler {
    if (!DatabaseHandler.instance) {
      DatabaseHandler.instance = new DatabaseHandler();
    }
    return DatabaseHandler.instance;
  }

  /**
   * Connect to MongoDB database
   */
  private async connect(): Promise<void> {
    if (this.db) {
      return; // Already connected
    }

    if (this.connectionPromise) {
      return this.connectionPromise; // Connection in progress
    }

    this.connectionPromise = (async () => {
      try {
        const uri = process.env.DATABASE_URL;

        if (!uri) {
          // Check if we're in build/static generation mode
          if (typeof window === 'undefined' && (process.env.NEXT_PHASE === 'phase-production-build' || process.env.NODE_ENV === 'production' || process.env.BUILD_TIME === 'true')) {
            console.warn('DATABASE_URL not available during build, skipping database connection');
            throw new Error('DATABASE_URL not available during build time');
          }
          throw new Error('DATABASE_URL environment variable is not defined');
        }

        this.client = new MongoClient(uri, {
          maxPoolSize: 5,
          minPoolSize: 1,
          serverSelectionTimeoutMS: 5000,
          maxIdleTimeMS: 30000,
        });

        await this.client.connect();

        // Extract database name from connection string or use default
        const dbName = new URL(uri).pathname.slice(1).split('?')[0] || 'test';
        this.db = this.client.db(dbName);

        console.log('✅ Database connected successfully');
      } catch (error) {
        console.error('❌ Database connection error:', error);
        this.client = null;
        this.db = null;
        this.connectionPromise = null;
        throw error;
      }
    })();

    return this.connectionPromise;
  }

  /**
   * Get database instance
   */
  private async getDb(): Promise<Db> {
    if (!this.db) {
      await this.connect();
    }
    if (!this.db) {
      throw new Error('Database connection failed');
    }
    return this.db;
  }

  /**
   * Get a collection
   */
  private async getCollection<T extends Document>(collectionName: string): Promise<Collection<T>> {
    const db = await this.getDb();
    return db.collection<T>(collectionName);
  }

  /**
   * Expose getCollection for advanced operations (bulkWrite, transactions, etc.)
   */
  public async getCollectionForOperations<T extends Document>(collectionName: string): Promise<Collection<T>> {
    return this.getCollection<T>(collectionName);
  }

  /**
   * CREATE: Insert a single document
   */
  public async create<T extends Document>(
    collectionName: string,
    data: OptionalId<T>
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const collection = await this.getCollection<T>(collectionName);
      const result = await collection.insertOne(data as OptionalUnlessRequiredId<T>);

      return {
        success: true,
        id: result.insertedId.toString(),
      };
    } catch (error) {
      console.error(`Error creating document in ${collectionName}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * CREATE MANY: Insert multiple documents
   */
  public async createMany<T extends Document>(
    collectionName: string,
    data: OptionalId<T>[]
  ): Promise<{ success: boolean; ids?: string[]; error?: string }> {
    try {
      const collection = await this.getCollection<T>(collectionName);
      const result = await collection.insertMany(data as OptionalUnlessRequiredId<T>[]);

      return {
        success: true,
        ids: result.insertedIds ? Object.values(result.insertedIds).map(id => id.toString()) : [],
      };
    } catch (error) {
      console.error(`Error creating documents in ${collectionName}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * READ: Find multiple documents
   */
  public async read<T extends Document>(
    collectionName: string,
    query: Filter<T> = {},
    options: {
      limit?: number;
      skip?: number;
      sort?: Record<string, 1 | -1>;
      projection?: Record<string, 0 | 1>;
    } = {}
  ): Promise<{ success: boolean; data?: T[]; error?: string }> {
    try {
      const collection = await this.getCollection<T>(collectionName);

      let cursor = collection.find(query);

      if (options.projection) {
        cursor = cursor.project(options.projection);
      }
      if (options.sort) {
        cursor = cursor.sort(options.sort);
      }
      if (options.skip) {
        cursor = cursor.skip(options.skip);
      }
      if (options.limit) {
        cursor = cursor.limit(options.limit);
      }

      const data = await cursor.toArray();

      return {
        success: true,
        data: data as T[],
      };
    } catch (error) {
      console.error(`Error reading documents from ${collectionName}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * READ ONE: Find a single document
   */
  public async readOne<T extends Document>(
    collectionName: string,
    query: Filter<T>
  ): Promise<{ success: boolean; data?: T | null; error?: string }> {
    try {
      const collection = await this.getCollection<T>(collectionName);
      const data = await collection.findOne(query);

      return {
        success: true,
        data: data as T | null,
      };
    } catch (error) {
      console.error(`Error reading document from ${collectionName}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * UPDATE: Update multiple documents
   */
  public async update<T extends Document>(
    collectionName: string,
    query: Filter<T>,
    data: UpdateFilter<T>
  ): Promise<{ success: boolean; modifiedCount?: number; error?: string }> {
    try {
      const collection = await this.getCollection<T>(collectionName);
      const result = await collection.updateMany(query, data);

      return {
        success: true,
        modifiedCount: result.modifiedCount,
      };
    } catch (error) {
      console.error(`Error updating documents in ${collectionName}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * UPDATE ONE: Update a single document
   */
  public async updateOne<T extends Document>(
    collectionName: string,
    query: Filter<T>,
    data: UpdateFilter<T>
  ): Promise<{ success: boolean; modifiedCount?: number; error?: string }> {
    try {
      const collection = await this.getCollection<T>(collectionName);
      const result = await collection.updateOne(query, data);

      return {
        success: true,
        modifiedCount: result.modifiedCount,
      };
    } catch (error) {
      console.error(`Error updating document in ${collectionName}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * DELETE: Delete multiple documents
   */
  public async delete<T extends Document>(
    collectionName: string,
    query: Filter<T>
  ): Promise<{ success: boolean; deletedCount?: number; error?: string }> {
    try {
      const collection = await this.getCollection<T>(collectionName);
      const result = await collection.deleteMany(query);

      return {
        success: true,
        deletedCount: result.deletedCount,
      };
    } catch (error) {
      console.error(`Error deleting documents from ${collectionName}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * DELETE ONE: Delete a single document
   */
  public async deleteOne<T extends Document>(
    collectionName: string,
    query: Filter<T>
  ): Promise<{ success: boolean; deletedCount?: number; error?: string }> {
    try {
      const collection = await this.getCollection<T>(collectionName);
      const result = await collection.deleteOne(query);

      return {
        success: true,
        deletedCount: result.deletedCount,
      };
    } catch (error) {
      console.error(`Error deleting document from ${collectionName}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * COUNT: Count documents matching query
   */
  public async count<T extends Document>(
    collectionName: string,
    query: Filter<T> = {}
  ): Promise<{ success: boolean; count?: number; error?: string }> {
    try {
      const collection = await this.getCollection<T>(collectionName);
      const count = await collection.countDocuments(query);

      return {
        success: true,
        count,
      };
    } catch (error) {
      console.error(`Error counting documents in ${collectionName}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Close database connection
   */
  public async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      this.connectionPromise = null;
      console.log('🔌 Database connection closed');
    }
  }
}

// Export singleton instance and class
export { DatabaseHandler };
export const db = DatabaseHandler.getInstance();
