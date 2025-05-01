
// src/services/database.ts
import { Pool, type QueryResult } from 'pg';
import type { DataEntry, RelationshipEntry } from './types';
import { v4 as uuidv4 } from 'uuid';

// ========================================================================
// ==                       PostgreSQL Implementation                    ==
// ========================================================================
// This service now connects to a PostgreSQL database.
// Ensure your environment variables are set correctly in .env
// Check the README.md for troubleshooting database connection errors.
// ========================================================================


// --- Connection Pool ---
let pool: Pool | null = null;

function getPool(): Pool {
    if (!pool) {
        const host = process.env.POSTGRES_HOST || 'localhost';
        const port = parseInt(process.env.POSTGRES_PORT || '5432', 10);
        const user = process.env.POSTGRES_USER;
        const password = process.env.POSTGRES_PASSWORD; // Keep confidential
        const database = process.env.POSTGRES_DATABASE;

        if (!user || !password || !database) {
             console.error("[Database Service] ERROR: Missing required PostgreSQL environment variables (POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DATABASE).");
             throw new Error("Missing required PostgreSQL environment variables.");
        }

        console.log(`[Database Service] Creating PostgreSQL connection pool with config: { host: ${host}, port: ${port}, user: ${user}, database: ${database}, password: [MASKED] }`);

        pool = new Pool({
            host: host,
            port: port,
            user: user,
            password: password,
            database: database,
            max: 10, // Max number of clients in the pool
            idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
            connectionTimeoutMillis: 5000, // Increased timeout for slower connections
        });

        pool.on('error', (err, client) => {
            console.error('[Database Service] PostgreSQL Pool Error: Unexpected error on idle client.', err);
            // Consider more robust error handling if needed
        });

        pool.on('connect', (client) => {
            console.log('[Database Service] Client connected to PostgreSQL.');
        });

        pool.on('acquire', (client) => {
            // This might be too verbose for regular use, uncomment if needed for debugging pool usage
            // console.log('[Database Service] Client acquired from pool.');
        });

        pool.on('remove', (client) => {
            // This might be too verbose, uncomment if needed
            // console.log('[Database Service] Client removed from pool.');
        });

         // Test the connection immediately and provide clearer error context
         console.log('[Database Service] Attempting initial connection test to PostgreSQL...');
         pool.query('SELECT NOW()')
             .then(res => console.log('[Database Service] PostgreSQL Pool connected successfully at:', res.rows[0].now))
             .catch(err => {
                 console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
                 console.error('[Database Service] FATAL: Initial PostgreSQL Pool connection test failed.');
                 console.error(`   Error Code: ${err.code}`);
                 console.error(`   Error Message: ${err.message}`);
                 console.error(`   Attempted to connect to: postgres://${user}:[MASKED]@${host}:${port}/${database}`);
                 console.error('   Troubleshooting Tips:');
                 console.error('     1. Is the PostgreSQL server running? Check services or use `pg_ctl status`.');
                 console.error('     2. Are the .env variables (POSTGRES_HOST, POSTGRES_PORT, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DATABASE) correct?');
                 console.error('     3. Is PostgreSQL configured to accept connections from this application host? Check `postgresql.conf` (listen_addresses) and `pg_hba.conf` (authentication methods).');
                 console.error('     4. Is a firewall blocking the connection to the PostgreSQL port?');
                 console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
                 // Allow the application to continue starting, but subsequent DB operations will likely fail.
                 // Throwing here would prevent the app server from starting at all.
                 // throw new Error(`Initial PostgreSQL connection failed: ${err.message}`);
             });

    }
    return pool;
}

// --- Schema Initialization ---
const CREATE_DATASETS_TABLE = `
CREATE TABLE IF NOT EXISTS datasets (
    name TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW()
);`;

const CREATE_DATA_ENTRIES_TABLE = `
CREATE TABLE IF NOT EXISTS data_entries (
    internal_id SERIAL PRIMARY KEY,
    dataset_name TEXT NOT NULL REFERENCES datasets(name) ON DELETE CASCADE,
    entry_id TEXT NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (dataset_name, entry_id)
);`;

const CREATE_RELATIONSHIPS_TABLE = `
CREATE TABLE IF NOT EXISTS relationships (
    id SERIAL PRIMARY KEY,
    dataset_name TEXT NOT NULL REFERENCES datasets(name) ON DELETE CASCADE,
    source_entry_id TEXT NOT NULL,
    target_entry_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (dataset_name, source_entry_id, target_entry_id),
    FOREIGN KEY (dataset_name, source_entry_id) REFERENCES data_entries (dataset_name, entry_id) ON DELETE CASCADE,
    FOREIGN KEY (dataset_name, target_entry_id) REFERENCES data_entries (dataset_name, entry_id) ON DELETE CASCADE
);`;

// Store the name of the active dataset in memory for simplicity
// NOTE: In a stateless or distributed environment, this should be stored elsewhere
// (e.g., user session, separate config table, Redis)
let activeDatasetName: string | null = null;


async function initializeSchema(): Promise<void> {
    console.log('[Database Service] Initializing database schema if needed...');
    let client;
    try {
        client = await getPool().connect(); // Use getPool() which includes the connection test
    } catch (connectError) {
         console.error('[Database Service] Failed to acquire client for schema initialization:', connectError);
         // Cannot proceed with schema init if connection fails
         throw new Error(`Failed to connect to database for schema initialization: ${connectError.message}`);
    }

    try {
        await client.query('BEGIN');
        await client.query(CREATE_DATASETS_TABLE);
        await client.query(CREATE_DATA_ENTRIES_TABLE);
        await client.query(CREATE_RELATIONSHIPS_TABLE);

        // Check if 'default' dataset exists, create if not
        const res = await client.query('SELECT name FROM datasets WHERE name = $1', ['default']);
        if (res.rowCount === 0) {
            console.log("[Database Service] 'default' dataset not found, creating...");
            await client.query('INSERT INTO datasets (name) VALUES ($1)', ['default']);
            console.log("[Database Service] 'default' dataset created.");
            // Populate default data ONLY if creating the dataset for the first time
            await populateDefaultData(client);
        } else {
            console.log("[Database Service] 'default' dataset already exists.");
        }

        await client.query('COMMIT');
        console.log('[Database Service] Schema initialization check complete.');

        // Set active dataset if not already set
        if (!activeDatasetName) {
            activeDatasetName = 'default';
            console.log(`[Database Service] Setting active dataset to '${activeDatasetName}'`);
        }

    } catch (err) {
        console.error('[Database Service] Error during schema initialization transaction:', err);
        try {
             await client.query('ROLLBACK');
             console.log('[Database Service] Schema initialization transaction rolled back.');
        } catch (rollbackErr) {
             console.error('[Database Service] Error rolling back schema initialization transaction:', rollbackErr);
        }
        throw err; // Re-throw to indicate failure
    } finally {
         if (client) {
            client.release();
         }
    }
}

async function populateDefaultData(client: any): Promise<void> {
     console.log('[Database Service] Populating default data for "default" dataset...');
     const initialDefaultData: Omit<DataEntry, 'id'>[] = [
         { name: 'Simulated Example Data', value: 123, timestamp: new Date().toISOString(), details: 'Some initial details' },
         { name: 'Another Simulated Entry', value: 456, category: 'Test', timestamp: new Date().toISOString(), email: ' test@example.com ', inconsistent_value: ' yes '},
         { complex: { nested: true, arr: [1, 2] }, description: 'Complex object example', timestamp: new Date().toISOString(), status: 'pending' },
     ];
     const datasetName = 'default';

     try {
        for (const entryData of initialDefaultData) {
             // Assign a UUID as the entry_id for consistency
             const entryId = uuidv4();
             const dataJson = JSON.stringify(entryData); // Store the whole object without id
             await client.query(
                 'INSERT INTO data_entries (dataset_name, entry_id, data) VALUES ($1, $2, $3)',
                 [datasetName, entryId, dataJson]
             );
             console.log(`[Database Service] Added default entry with ID ${entryId} to dataset '${datasetName}'.`);
        }
         console.log('[Database Service] Default data populated successfully.');
     } catch (error) {
         console.error('[Database Service] Error populating default data:', error);
         // Don't rollback the dataset creation, but log the error
     }
}


// Initialize schema on load - wrap in async IIFE
(async () => {
    try {
        // getPool() is called internally by initializeSchema
        await initializeSchema();
    } catch (error) {
        console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        console.error("FATAL: Failed to initialize database schema on startup.");
        console.error("   Please check the database connection details in .env and ensure the PostgreSQL server is running and accessible.");
        console.error("   See detailed error above or in the README.md troubleshooting section.");
        console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        // Consider exiting the process if schema init is critical, but this might hide the error in some environments
        // process.exit(1);
    }
})();

// --- Public API ---

/**
 * Sets the active dataset name in memory.
 * NOTE: Does NOT check if the dataset exists in the DB here. Operations will fail later if it doesn't.
 * @param name The name of the dataset to activate.
 * @returns True (as validation happens during operations).
 */
export async function setActiveDataset(name: string): Promise<boolean> {
    console.log(`[setActiveDataset Service] Attempting to set active dataset to: ${name}`);
    activeDatasetName = name;
    console.log(`[setActiveDataset Service] Active dataset is now: ${activeDatasetName}`);
    return true; // Assume success, actual validation happens in operations
}

/**
 * Gets the name of the currently active dataset stored in memory.
 * @returns The name of the active dataset or null if none is active.
 */
export async function getActiveDatasetName(): Promise<string | null> {
    console.log(`[getActiveDatasetName Service] Returning active dataset name: ${activeDatasetName}`);
    return activeDatasetName;
}

/**
 * Gets the names of all available datasets from the database.
 * @returns A promise resolving to an array of dataset names.
 */
export async function getAllDatasetNames(): Promise<string[]> {
    console.log('[getAllDatasetNames Service] Fetching all dataset names from DB...');
    const client = await getPool().connect(); // Ensures pool is initialized and attempts connection
    try {
        const result: QueryResult<{ name: string }> = await client.query('SELECT name FROM datasets ORDER BY name');
        const names = result.rows.map(row => row.name);
        console.log(`[getAllDatasetNames Service] Returning names: [${names.join(', ')}]`);
        return names;
    } catch (error) {
        console.error('[getAllDatasetNames Service] Error fetching dataset names:', error);
        throw new Error(`Failed to fetch dataset names from database: ${error.message}`);
    } finally {
        client.release();
    }
}

/**
 * Creates a new dataset entry in the database. If the dataset already exists, it does nothing.
 * Sets the newly created dataset as the active one.
 * Populates the dataset with the provided initial data.
 *
 * @param name The name for the new dataset.
 * @param initialData The initial array of DataEntry objects for the dataset.
 * @returns A promise resolving to true if creation/population was successful, false otherwise.
 */
export async function createOrReplaceDataset(name: string, initialData: DataEntry[]): Promise<boolean> {
    const trimmedName = name.trim();
    console.log(`[createOrReplaceDataset Service] Called for name: ${trimmedName}. Initial data count: ${initialData.length}`);
    if (!trimmedName) {
        console.error('[createOrReplaceDataset Service] Invalid dataset name provided.');
        return false;
    }

    const client = await getPool().connect();
    try {
        await client.query('BEGIN');

        // Create dataset entry (ignore if exists)
        await client.query('INSERT INTO datasets (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [trimmedName]);
        console.log(`[createOrReplaceDataset Service] Ensured dataset '${trimmedName}' exists.`);

        // Clear existing data and relationships for this dataset before adding new ones
        console.log(`[createOrReplaceDataset Service] Clearing existing data and relationships for dataset '${trimmedName}'...`);
        await client.query('DELETE FROM relationships WHERE dataset_name = $1', [trimmedName]);
        await client.query('DELETE FROM data_entries WHERE dataset_name = $1', [trimmedName]);
        console.log(`[createOrReplaceDataset Service] Existing entries and relationships cleared for '${trimmedName}'.`);


        // Insert new data entries
        for (const entryData of initialData) {
            // Assign a UUID if id is missing, otherwise use provided id (converted to string)
            const entryId = entryData.id ? String(entryData.id) : uuidv4();
            // Remove 'id' from the data to be stored in JSONB, if it exists
            const { id, ...dataToStore } = entryData;
            const dataJson = JSON.stringify(dataToStore);

            await client.query(
                'INSERT INTO data_entries (dataset_name, entry_id, data) VALUES ($1, $2, $3)',
                [trimmedName, entryId, dataJson]
            );
             console.log(`[createOrReplaceDataset Service] Added entry with ID ${entryId} to dataset '${trimmedName}'.`);
        }

        await client.query('COMMIT');
        activeDatasetName = trimmedName; // Set the new dataset as active

        console.log(`[createOrReplaceDataset Service] Dataset '${trimmedName}' created/replaced and set as active.`);
        console.log(`[createOrReplaceDataset Service] Inserted ${initialData.length} new entries.`);
        return true;

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`[createOrReplaceDataset Service] Error creating/replacing dataset '${trimmedName}':`, error);
        // Attempt to reset active dataset name if the failed one was set
        if (activeDatasetName === trimmedName) {
            const names = await getAllDatasetNames(); // Fetch existing names again
            activeDatasetName = names.length > 0 ? names[0] : null; // Reset to first or null
            console.warn(`[createOrReplaceDataset Service] Reset active dataset name to '${activeDatasetName}' due to error.`);
        }
        return false;
    } finally {
        client.release();
    }
}


/**
 * Asynchronously adds one or more data entries to the *active* dataset in PostgreSQL.
 *
 * @param data The data entry or array of entries to add.
 * @returns A promise that resolves to true if the operation was successful, false otherwise.
 */
export async function addData(data: DataEntry | DataEntry[]): Promise<boolean> {
    const currentActiveDataset = activeDatasetName; // Capture at the start
    if (!currentActiveDataset) {
        console.error('[addData Service] Cannot add data, no active dataset selected.');
        return false;
    }
    console.log(`[addData Service - Active: ${currentActiveDataset}] Called.`);

    const client = await getPool().connect();
    try {
        await client.query('BEGIN');

        const entriesToAdd = Array.isArray(data) ? data : [data];

        for (const entry of entriesToAdd) {
            // Assign a UUID if id is missing, otherwise use provided id (converted to string)
            const entryId = entry.id ? String(entry.id) : uuidv4();
            // Remove 'id' from the data to be stored in JSONB, if it exists
            const { id, ...dataToStore } = entry;
            const dataJson = JSON.stringify(dataToStore);

            // Use ON CONFLICT to handle potential duplicate entry_id within the same dataset
            // This effectively makes addData behave like an upsert based on entry_id
            const query = `
                INSERT INTO data_entries (dataset_name, entry_id, data)
                VALUES ($1, $2, $3)
                ON CONFLICT (dataset_name, entry_id)
                DO UPDATE SET data = EXCLUDED.data;
            `;
            await client.query(query, [currentActiveDataset, entryId, dataJson]);
            console.log(`[addData Service - Active: ${currentActiveDataset}] Added/Updated entry with ID: ${entryId}`);
        }

        await client.query('COMMIT');
        console.log(`[addData Service - Active: ${currentActiveDataset}] Successfully added/updated ${entriesToAdd.length} entries.`);
        return true;

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`[addData Service - Active: ${currentActiveDataset}] Error adding data:`, error);
        return false;
    } finally {
        client.release();
    }
}

/**
 * Asynchronously fetches all data entries from the *active* dataset in PostgreSQL.
 *
 * @returns A promise that resolves to an array of DataEntry objects.
 * @throws {Error} If the operation fails or no dataset is active.
 */
export async function getAllData(): Promise<DataEntry[]> {
    const currentActiveDataset = activeDatasetName; // Capture at the start
    if (!currentActiveDataset) {
        console.error('[getAllData Service] No active dataset selected.');
        throw new Error('No active dataset selected.');
    }
    console.log(`[getAllData Service - Active: ${currentActiveDataset}] Called.`);
    const client = await getPool().connect();
    try {
        const result: QueryResult<{ entry_id: string; data: any }> = await client.query(
            'SELECT entry_id, data FROM data_entries WHERE dataset_name = $1 ORDER BY created_at DESC',
            [currentActiveDataset]
        );

        // Combine entry_id back into the data object
        const entries = result.rows.map(row => ({
            id: row.entry_id, // Use entry_id as the 'id' field
            ...row.data        // Spread the JSONB data
        }));

        console.log(`[getAllData Service - Active: ${currentActiveDataset}] Returning ${entries.length} entries.`);
        return entries;
    } catch (error) {
        console.error(`[getAllData Service - Active: ${currentActiveDataset}] Error fetching data:`, error);
        throw new Error(`Failed to fetch data from database: ${error.message}`);
    } finally {
        client.release();
    }
}

/**
 * Asynchronously fetches a single data entry by its ID from the *active* dataset in PostgreSQL.
 *
 * @param id The entry_id of the data entry to fetch.
 * @returns A promise that resolves to the DataEntry object or null if not found.
 * @throws {Error} If the operation fails or no dataset is active.
 */
export async function getDataById(id: number | string): Promise<DataEntry | null> {
    const currentActiveDataset = activeDatasetName; // Capture at the start
    if (!currentActiveDataset) {
        console.error(`[getDataById Service] No active dataset selected.`);
        throw new Error('No active dataset selected.');
    }
    const searchId = String(id);
    console.log(`[getDataById Service - Active: ${currentActiveDataset}] Called for ID: ${searchId}`);

    const client = await getPool().connect();
    try {
        const result: QueryResult<{ entry_id: string; data: any }> = await client.query(
            'SELECT entry_id, data FROM data_entries WHERE dataset_name = $1 AND entry_id = $2',
            [currentActiveDataset, searchId]
        );

        if (result.rowCount === 0) {
            console.warn(`[getDataById Service - Active: ${currentActiveDataset}] Entry not found for ID ${searchId}.`);
            return null;
        }

        const row = result.rows[0];
        const entry = {
            id: row.entry_id,
            ...row.data
        };
        console.log(`[getDataById Service - Active: ${currentActiveDataset}] Found entry for ID ${searchId}.`);
        return entry;

    } catch (error) {
        console.error(`[getDataById Service - Active: ${currentActiveDataset}] Error fetching data for ID ${searchId}:`, error);
        throw new Error(`Failed to fetch data for ID ${searchId} from database: ${error.message}`);
    } finally {
        client.release();
    }
}


/**
 * Asynchronously fetches multiple data entries by their IDs from the *active* dataset in PostgreSQL.
 *
 * @param ids An array of entry_ids of the data entries to fetch.
 * @returns A promise that resolves to an array of DataEntry objects found.
 * @throws {Error} If the operation fails or no dataset is active.
 */
export async function getDataByIds(ids: (number | string)[]): Promise<DataEntry[]> {
    const currentActiveDataset = activeDatasetName; // Capture at the start
    if (!currentActiveDataset) {
        console.error(`[getDataByIds Service] No active dataset selected.`);
        throw new Error('No active dataset selected.');
    }
    const searchIds = ids.map(String);
    if (searchIds.length === 0) {
        return []; // Return empty array if no IDs are provided
    }
    console.log(`[getDataByIds Service - Active: ${currentActiveDataset}] Called for IDs: [${searchIds.join(', ')}]`);

    const client = await getPool().connect();
    try {
        const query = `
            SELECT entry_id, data
            FROM data_entries
            WHERE dataset_name = $1 AND entry_id = ANY($2::text[])
        `;
        const result: QueryResult<{ entry_id: string; data: any }> = await client.query(query, [currentActiveDataset, searchIds]);

        const entries = result.rows.map(row => ({
            id: row.entry_id,
            ...row.data
        }));

        console.log(`[getDataByIds Service - Active: ${currentActiveDataset}] Found ${entries.length} entries for IDs [${searchIds.join(', ')}].`);
        return entries;
    } catch (error) {
        console.error(`[getDataByIds Service - Active: ${currentActiveDataset}] Error fetching data for IDs [${searchIds.join(', ')}]:`, error);
        throw new Error(`Failed to fetch multiple data entries from database: ${error.message}`);
    } finally {
        client.release();
    }
}

/**
 * Asynchronously updates a data entry by its ID in the *active* dataset in PostgreSQL.
 *
 * @param id The entry_id of the data entry to update.
 * @param updatedData The partial or full data object. The 'id' field within this object is ignored.
 * @returns A promise that resolves to true if the update was successful (row found and updated), false otherwise.
 * @throws {Error} If the operation fails or no dataset is active.
 */
export async function updateDataById(id: number | string, updatedData: Partial<DataEntry>): Promise<boolean> {
    const currentActiveDataset = activeDatasetName; // Capture at the start
    if (!currentActiveDataset) {
        console.error(`[updateDataById Service] Cannot update data, no active dataset.`);
        throw new Error('No active dataset selected.');
    }
    const updateId = String(id);
    // Remove 'id' property from the data to be stored/merged in JSONB
    const { id: ignoredId, ...dataToUpdate } = updatedData;
    const dataJson = JSON.stringify(dataToUpdate);

    console.log(`[updateDataById Service - Active: ${currentActiveDataset}] Called for ID: ${updateId}`);

    const client = await getPool().connect();
    try {
        // We update the entire JSONB column with the new data.
        // For merging/partial updates, JSONB operators could be used, but replacing is simpler here.
        const query = `
            UPDATE data_entries
            SET data = $3
            WHERE dataset_name = $1 AND entry_id = $2
        `;
        const result = await client.query(query, [currentActiveDataset, updateId, dataJson]);

        if (result.rowCount === 0) {
            console.warn(`[updateDataById Service - Active: ${currentActiveDataset}] Entry not found for update (ID: ${updateId}).`);
            return false;
        }

        console.log(`[updateDataById Service - Active: ${currentActiveDataset}] Successfully updated entry ID ${updateId}.`);
        return true;
    } catch (error) {
        console.error(`[updateDataById Service - Active: ${currentActiveDataset}] Error updating data for ID ${updateId}:`, error);
        throw new Error(`Failed to update data for ID ${updateId} in database: ${error.message}`);
    } finally {
        client.release();
    }
}

// --- Relationship Operations ---

/**
 * Asynchronously adds a relationship between two data entries in the *active* dataset in PostgreSQL.
 * Does nothing if the relationship already exists.
 *
 * @param sourceEntryId The ID of the source entry.
 * @param targetEntryId The ID of the target entry.
 * @returns A promise that resolves to the newly created or existing RelationshipEntry or null if source/target not found or self-reference.
 * @throws {Error} If the database operation fails or no dataset is active.
 */
export async function addRelationship(sourceEntryId: number | string, targetEntryId: number | string): Promise<RelationshipEntry | null> {
    const currentActiveDataset = activeDatasetName; // Capture at the start
    if (!currentActiveDataset) {
        console.error(`[addRelationship Service] Cannot add relationship, no active dataset.`);
        throw new Error('No active dataset selected.');
    }
    const sourceIdStr = String(sourceEntryId);
    const targetIdStr = String(targetEntryId);
    console.log(`[addRelationship Service - Active: ${currentActiveDataset}] Called: Source ${sourceIdStr}, Target ${targetIdStr}`);

    if (sourceIdStr === targetIdStr) {
        console.warn(`[addRelationship Service - Active: ${currentActiveDataset}] Failed: Cannot add self-referencing relationship for ID ${sourceIdStr}.`);
        return null;
    }

    const client = await getPool().connect();
    try {
        await client.query('BEGIN');

        // Check if source and target entries exist in the active dataset
        const checkSource = await client.query('SELECT 1 FROM data_entries WHERE dataset_name = $1 AND entry_id = $2', [currentActiveDataset, sourceIdStr]);
        const checkTarget = await client.query('SELECT 1 FROM data_entries WHERE dataset_name = $1 AND entry_id = $2', [currentActiveDataset, targetIdStr]);

        if (checkSource.rowCount === 0) {
            console.warn(`[addRelationship Service - Active: ${currentActiveDataset}] Failed: Source ID ${sourceIdStr} not found.`);
            await client.query('ROLLBACK');
            return null;
        }
        if (checkTarget.rowCount === 0) {
            console.warn(`[addRelationship Service - Active: ${currentActiveDataset}] Failed: Target ID ${targetIdStr} not found.`);
            await client.query('ROLLBACK');
            return null;
        }

        // Insert the relationship, ignoring if it already exists
        const insertQuery = `
            INSERT INTO relationships (dataset_name, source_entry_id, target_entry_id)
            VALUES ($1, $2, $3)
            ON CONFLICT (dataset_name, source_entry_id, target_entry_id) DO NOTHING
            RETURNING id, source_entry_id, target_entry_id, created_at;
        `;
        const insertResult = await client.query(insertQuery, [currentActiveDataset, sourceIdStr, targetIdStr]);

        let relationship: RelationshipEntry | null = null;
        if (insertResult.rowCount > 0) {
            relationship = insertResult.rows[0];
            console.log(`[addRelationship Service - Active: ${currentActiveDataset}] Successfully added relationship:`, relationship);
        } else {
            // Relationship already existed, fetch it
            console.log(`[addRelationship Service - Active: ${currentActiveDataset}] Relationship ${sourceIdStr} -> ${targetIdStr} already exists. Fetching...`);
             const selectResult = await client.query(
                 'SELECT id, source_entry_id, target_entry_id, created_at FROM relationships WHERE dataset_name = $1 AND source_entry_id = $2 AND target_entry_id = $3',
                 [currentActiveDataset, sourceIdStr, targetIdStr]
             );
             if (selectResult.rowCount > 0) {
                 relationship = selectResult.rows[0];
             } else {
                 // Should not happen if ON CONFLICT worked correctly, but handle defensively
                 console.error(`[addRelationship Service - Active: ${currentActiveDataset}] Could not find existing relationship ${sourceIdStr} -> ${targetIdStr} after ON CONFLICT.`);
             }
        }

        await client.query('COMMIT');
        return relationship;

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`[addRelationship Service - Active: ${currentActiveDataset}] Error adding relationship ${sourceIdStr} -> ${targetIdStr}:`, error);
        throw new Error(`Failed to add relationship ${sourceIdStr} -> ${targetIdStr} in database: ${error.message}`);
    } finally {
        client.release();
    }
}


/**
 * Asynchronously fetches all relationships originating from a specific source ID in the *active* dataset from PostgreSQL.
 *
 * @param sourceEntryId The ID of the source entry.
 * @returns A promise resolving to an array of RelationshipEntry objects.
 * @throws {Error} If the operation fails or no dataset is active.
 */
export async function getRelationshipsBySourceId(sourceEntryId: number | string): Promise<RelationshipEntry[]> {
    const currentActiveDataset = activeDatasetName; // Capture at the start
    if (!currentActiveDataset) {
        console.error(`[getRelationshipsBySourceId Service] No active dataset selected.`);
        throw new Error('No active dataset selected.');
    }
    const sourceIdStr = String(sourceEntryId);
    console.log(`[getRelationshipsBySourceId Service - Active: ${currentActiveDataset}] Called for source ID: ${sourceIdStr}`);

    const client = await getPool().connect();
    try {
        const query = `
            SELECT id, source_entry_id, target_entry_id, created_at
            FROM relationships
            WHERE dataset_name = $1 AND source_entry_id = $2
            ORDER BY created_at DESC;
        `;
        const result: QueryResult<RelationshipEntry> = await client.query(query, [currentActiveDataset, sourceIdStr]);

        console.log(`[getRelationshipsBySourceId Service - Active: ${currentActiveDataset}] Found ${result.rowCount} relationships for source ${sourceIdStr}.`);
        return result.rows;
    } catch (error) {
        console.error(`[getRelationshipsBySourceId Service - Active: ${currentActiveDataset}] Error fetching relationships for source ID ${sourceIdStr}:`, error);
        throw new Error(`Failed to fetch relationships for ID ${sourceIdStr} from database: ${error.message}`);
    } finally {
        client.release();
    }
}

/**
 * Asynchronously fetches all relationships from the *active* dataset in PostgreSQL.
 *
 * @returns A promise resolving to an array of all RelationshipEntry objects in the active dataset.
 * @throws {Error} If the operation fails or no dataset is active.
 */
export async function getAllRelationships(): Promise<RelationshipEntry[]> {
    const currentActiveDataset = activeDatasetName; // Capture at the start
    if (!currentActiveDataset) {
        console.error(`[getAllRelationships Service] No active dataset selected.`);
        throw new Error('No active dataset selected.');
    }
    console.log(`[getAllRelationships Service - Active: ${currentActiveDataset}] Called`);

    const client = await getPool().connect();
    try {
        const query = `
            SELECT id, source_entry_id, target_entry_id, created_at
            FROM relationships
            WHERE dataset_name = $1
            ORDER BY created_at DESC;
        `;
        const result: QueryResult<RelationshipEntry> = await client.query(query, [currentActiveDataset]);

        console.log(`[getAllRelationships Service - Active: ${currentActiveDataset}] Returning ${result.rowCount} relationships.`);
        return result.rows;
    } catch (error) {
        console.error(`[getAllRelationships Service - Active: ${currentActiveDataset}] Error fetching all relationships:`, error);
        throw new Error(`Failed to fetch all relationships from database: ${error.message}`);
    } finally {
        client.release();
    }
}

// Consider adding functions for deleting entries and relationships if needed.
// export async function deleteDataById(id: number | string): Promise<boolean> { ... }
// export async function deleteRelationship(relationshipId: number): Promise<boolean> { ... }
// export async function deleteDataset(name: string): Promise<boolean> { ... }

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('[Database Service] Received SIGINT. Closing connection pool...');
  if (pool) {
    await pool.end();
    console.log('[Database Service] Connection pool closed.');
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('[Database Service] Received SIGTERM. Closing connection pool...');
  if (pool) {
    await pool.end();
    console.log('[Database Service] Connection pool closed.');
  }
  process.exit(0);
});

