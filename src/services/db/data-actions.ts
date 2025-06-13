
import type { QueryResult } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { SHOW_ALL_TABLES, SHOW_ALL_DATABASES, SHOW_ALL_RELATIONSHIPS } from './schema';
import { getClient, pool } from './dbconnect';
import type { DataEntry, RelationshipEntry } from '../types';


export async function addData({ data }: { data: DataEntry | DataEntry[]; }): Promise<boolean> {
    const currentActiveDataset = "demo";
    if (!currentActiveDataset) {
        console.error('No active dataset for addData operation.');
        return false;
    }

    const entriesToAdd = Array.isArray(data) ? data : [data];
    if (entriesToAdd.length === 0) {
        return true; // Nothing to add
    }

    const client = await getClient();
   try {
        await client.query('BEGIN');

        for (const entry of entriesToAdd) {
            const entryId = entry.id ? String(entry.id) : uuidv4();
            const { id, ...dataToStore } = entry;
            const dataJson = JSON.stringify(dataToStore);

            const query = `
                INSERT INTO data_entries (dataset_name, entry_id, data)
                VALUES ($1, $2, $3)
                ON CONFLICT (dataset_name, entry_id)
                DO UPDATE SET data = EXCLUDED.data;
            `;
            await client.query(query, [currentActiveDataset, entryId, dataJson]);
        }
        await client.query('COMMIT');
        return true;

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error in addData:', error);
        return false; // Indicate failure
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
export async function getAllData(activeDatasetName: string): Promise<DataEntry[]> {
    const currentActiveDataset = activeDatasetName; 
    if (!currentActiveDataset) {
        console.error('No active dataset selected for getAllData.');
        return [];
    }
    const client = await getClient();
    try {
        const result: QueryResult<{ entry_id: string; data: any }> = await client.query(
            'SELECT entry_id, data FROM data_entries WHERE dataset_name = $1 ORDER BY created_at DESC',
            [currentActiveDataset]);

        const entries = result.rows.map(row => ({
            id: row.entry_id, 
            ...row.data        
        }));
        return entries;
    } catch (error) {
        console.error(`Failed to fetch data from database for dataset '${currentActiveDataset}':`, error);
        return []; // Return empty array on error
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
export async function getDataById(activeDatasetName:string, id: string): Promise<DataEntry | null> {
    const currentActiveDataset = activeDatasetName; 
    if (!currentActiveDataset) {
         console.error('No active dataset selected for getDataById.');
        return null;
    }
    const searchId = String(id);

    const client = await getClient();
    try {
        const result: QueryResult<{ entry_id: string; data: any }> = await client.query(
            'SELECT entry_id, data FROM data_entries WHERE dataset_name = $1 AND entry_id = $2',
            [currentActiveDataset, searchId]
        );

        if (result.rowCount === 0) {
            return null;
        }

        const row = result.rows[0];
        const entry = {
            id: row.entry_id,
            ...row.data
        };
        return entry;

   } catch (error) {
    console.error(`Failed to fetch data for ID ${searchId} from dataset '${currentActiveDataset}':`, error);
    return null; // Return null on error
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
export async function getDataByIds(activeDatasetName:string, ids: string[]): Promise<DataEntry[]> {
    const currentActiveDataset = activeDatasetName; 
    if (!currentActiveDataset) {
       console.error('No active dataset selected for getDataByIds.');
        return [];
    }
    const searchIds = ids.map(String);
    if (searchIds.length === 0) {
        return []; 
    }

    const client = await getClient();
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

        return entries;
    } catch (error) {
        console.error(`Failed to fetch multiple data entries from dataset '${currentActiveDataset}':`, error);
        return []; // Return empty array on error
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
export async function updateDataById(activeDatasetName:string, id: string, updatedData: Omit<DataEntry, 'id'>): Promise<boolean> {
    const currentActiveDataset = activeDatasetName; 
    if (!currentActiveDataset) {
        console.error('No active dataset selected for updateDataById.');
        return false;
    }
    const updateId = String(id);
    const dataJson = JSON.stringify(updatedData);


    const client = await getClient();
    try {
        const query = `
            UPDATE data_entries
            SET data = $3
            WHERE dataset_name = $1 AND entry_id = $2
        `;
        const result = await client.query(query, [currentActiveDataset, updateId, dataJson]);
        return result.rowCount > 0;
    } catch (error) {
        console.error(`Failed to update data for ID ${updateId} in dataset '${currentActiveDataset}':`, error);
        return false; // Indicate failure
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
export async function addRelationship(activeDatasetName:string, sourceEntryId: string, targetEntryId: string): Promise<RelationshipEntry | null> {
    const currentActiveDataset = activeDatasetName; 
    if (!currentActiveDataset) {
        console.error('No active dataset selected for addRelationship.');
        return null;
    }
    const sourceIdStr = String(sourceEntryId);
    const targetIdStr = String(targetEntryId);
   
    if (sourceIdStr === targetIdStr) {
        console.warn(`Attempted to create self-referencing relationship for ID ${sourceIdStr} in dataset ${currentActiveDataset}.`);
        return null;
    }

    const client = await getClient();
    try {
        await client.query('BEGIN');

        const checkSource = await client.query('SELECT 1 FROM data_entries WHERE dataset_name = $1 AND entry_id = $2', [currentActiveDataset, sourceIdStr]);
        const checkTarget = await client.query('SELECT 1 FROM data_entries WHERE dataset_name = $1 AND entry_id = $2', [currentActiveDataset, targetIdStr]);

        if (checkSource.rowCount === 0) {
            console.warn(`Source entry ID ${sourceIdStr} not found in dataset '${currentActiveDataset}' for addRelationship.`);
            await client.query('ROLLBACK');
            return null;
        }
        if (checkTarget.rowCount === 0) {
            console.warn(`Target entry ID ${targetIdStr} not found in dataset '${currentActiveDataset}' for addRelationship.`);
            await client.query('ROLLBACK');
            return null;
        }

        const insertQuery = `
            INSERT INTO relationships (dataset_name, source_entry_id, target_entry_id)
            VALUES ($1, $2, $3)
            ON CONFLICT (dataset_name, source_entry_id, target_entry_id) DO NOTHING
            RETURNING id, source_entry_id, target_entry_id, created_at;
        `;
        // Try to insert, if it conflicts (already exists), then query for the existing one.
        let insertResult = await client.query(insertQuery, [currentActiveDataset, sourceIdStr, targetIdStr]);
        
        if (insertResult.rowCount === 0) { // Relationship already existed
            const selectQuery = `
                SELECT id, source_entry_id, target_entry_id, created_at
                FROM relationships
                WHERE dataset_name = $1 AND source_entry_id = $2 AND target_entry_id = $3;
            `;
            insertResult = await client.query(selectQuery, [currentActiveDataset, sourceIdStr, targetIdStr]);
        }
        
        await client.query('COMMIT');
        return insertResult.rows[0] || null;

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`Failed to add relationship ${sourceIdStr} -> ${targetIdStr} in dataset '${currentActiveDataset}':`, error);
        return null; // Return null on error
    } finally {
        client.release();
    }
}
 export async function getAllRelationships(activeDatasetName: string): Promise<RelationshipEntry[]> {
    const currentActiveDataset = activeDatasetName;
    if (!currentActiveDataset) {
        console.error('No active dataset selected for getAllRelationships.');
        return [];
    }
    const client = await pool.connect(); // Using pool directly as in original
    try {
        const result: QueryResult<RelationshipEntry> = await client.query(
            'SELECT id, source_entry_id, target_entry_id, created_at FROM relationships WHERE dataset_name = $1 ORDER BY created_at DESC',
            [currentActiveDataset]
        );
        return result.rows;
    } catch (error) {
        console.error(`Failed to fetch all relationships for dataset '${currentActiveDataset}':`, error);
        return [];
    } finally {
        client.release();
    }
}

 
export async function getAllPostgresItems(): Promise<any[]> {
    const client = await pool.connect(); // Using pool directly as in original
    try {
        const tablesResult = await client.query(SHOW_ALL_TABLES);
        const databasesResult = await client.query(SHOW_ALL_DATABASES);
        const relationshipsResult = await client.query(SHOW_ALL_RELATIONSHIPS);
        // Log results for debugging
        // console.log("Tables:", tablesResult.rows);
        // console.log("Databases:", databasesResult.rows);
        // console.log("Relationships FKs:", relationshipsResult.rows);
        return [tablesResult.rows, databasesResult.rows, relationshipsResult.rows];
    } catch (error) {
        console.error('Failed to fetch all PostgreSQL items:', error);
        return [[], [], []]; // Return empty arrays on error
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
export async function getRelationshipsBySourceId(activeDatasetName:string, sourceEntryId: string): Promise<RelationshipEntry[]> {
    const currentActiveDataset = activeDatasetName; 
    if (!currentActiveDataset) {
        console.error('No active dataset selected for getRelationshipsBySourceId.');
        return [];
    }
    const sourceIdStr = String(sourceEntryId);

    const client = await getClient();
    try {
        const query = `
            SELECT id, source_entry_id, target_entry_id, created_at
            FROM relationships
            WHERE dataset_name = $1 AND source_entry_id = $2
            ORDER BY created_at DESC;
        `;
        const result: QueryResult<RelationshipEntry> = await client.query(query, [currentActiveDataset, sourceIdStr]);
        return result.rows;
    } catch (error) {
        console.error(`Failed to fetch relationships for ID ${sourceIdStr} from dataset '${currentActiveDataset}':`, error);
        return []; // Return empty array on error
    } finally {
        client.release();
    }
}

// --- Dataset Schema Operations ---

// Renamed from createTables to initializeDatabaseSchema
export async function initializeDatabaseSchema(): Promise<void> {
  const client = await pool.connect();
  try {
    console.log('[DB Service] Initializing database schema...');
    await client.query('BEGIN');
    await client.query(CREATE_DATASETS_TABLE);
    await client.query(CREATE_DATA_ENTRIES_TABLE);
    await client.query(CREATE_RELATIONSHIPS_TABLE);
    await client.query('COMMIT');
    console.log('[DB Service] Database schema initialized successfully (or already exists).');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[DB Service] Error initializing database schema:', error);
    throw error; // Re-throw to indicate failure
  } finally {
    client.release();
  }
}


// --- Active Dataset Management (In-Memory, to be replaced by DB if needed for persistence across restarts) ---
let activeDataset: string | null = null; // Default to 'demo' or null if it must be explicitly set

/**
 * Sets the active dataset name.
 * This function now ensures the dataset exists in the 'datasets' table.
 * If it doesn't exist, it will be created.
 */
export async function setActiveDataset(name: string): Promise<boolean> {
    const client = await pool.connect();
    try {
        console.log(`[DB Service] Attempting to set active dataset to: ${name}`);
        await client.query('BEGIN');
        // Check if dataset exists
        const checkResult = await client.query('SELECT name FROM datasets WHERE name = $1', [name]);
        if (checkResult.rowCount === 0) {
            // Dataset does not exist, create it
            console.log(`[DB Service] Dataset '${name}' not found, creating it.`);
            await client.query('INSERT INTO datasets (name) VALUES ($1)', [name]);
        }
        await client.query('COMMIT');
        activeDataset = name; // Set in-memory active dataset
        console.log(`[DB Service] Active dataset is now '${name}'.`);
        return true;
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`[DB Service] Error setting or creating active dataset '${name}':`, error);
        return false;
    } finally {
        client.release();
    }
}


/**
 * Gets the name of the currently active dataset.
 */
export async function getActiveDatasetName(): Promise<string | null> {
    console.log(`[DB Service] Returning active dataset name: ${activeDataset}`);
    return activeDataset;
}


/**
 * Fetches all dataset names from the 'datasets' table.
 */
export async function getAllDatasetNames(): Promise<string[]> {
    console.log('[DB Service] Fetching all dataset names from DB...');
    const client = await pool.connect(); // Ensures pool is initialized and attempts connection
    try {
        const result: QueryResult<{ name: string }> = await client.query('SELECT name FROM datasets ORDER BY name');
        const names = result.rows.map(row => row.name);
        console.log(`[DB Service] Found dataset names: [${names.join(', ')}]`);
        if (names.length > 0 && !activeDataset) {
            // If no active dataset is set but datasets exist, set the first one as active.
            // This ensures an active dataset is available on initial load if data exists.
            // console.log(`[DB Service] No active dataset set, defaulting to first available: '${names[0]}'`);
            // await setActiveDataset(names[0]); // This could cause a loop if called from setActiveDataset
        }
        return names;
    } catch (error) {
        console.error('[DB Service] Error fetching dataset names from DB:', error);
        return []; // Return empty array on error
    } finally {
        client.release();
    }
}

/**
 * Creates a new dataset with the provided data. If a dataset with the same name exists, it's replaced.
 * Sets the new/replaced dataset as active.
 * Expects `newData` where entries can have optional string IDs.
 */
export async function createOrReplaceDataset(datasetName: string, newData: DataEntry[]): Promise<boolean> {
    const client = await pool.connect();
    try {
        console.log(`[DB Service] Attempting to create/replace dataset: '${datasetName}' with ${newData.length} entries.`);
        await client.query('BEGIN');

        // Delete existing dataset if it exists (cascades to entries and relationships)
        await client.query('DELETE FROM datasets WHERE name = $1', [datasetName]);
        // Create the new dataset entry in 'datasets' table
        await client.query('INSERT INTO datasets (name) VALUES ($1)', [datasetName]);

        // Add new data entries
        for (const entry of newData) {
            // Assign a UUID if 'id' is missing or explicitly convert provided 'id' to string
            const entryId = entry.id ? String(entry.id) : uuidv4();
            // Remove 'id' from the data to be stored in JSONB, as it's in 'entry_id'
            const { id, ...dataToStore } = entry;
            const dataJson = JSON.stringify(dataToStore);

            const insertQuery = `
                INSERT INTO data_entries (dataset_name, entry_id, data)
                VALUES ($1, $2, $3);
            `;
            await client.query(insertQuery, [datasetName, entryId, dataJson]);
        }

        await client.query('COMMIT');
        console.log(`[DB Service] Dataset '${datasetName}' created/replaced successfully.`);
        await setActiveDataset(datasetName); // Set as active
        return true;
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`[DB Service] Error creating/replacing dataset '${datasetName}':`, error);
        return false;
    } finally {
        client.release();
    }
}

// Initialize schema when the module loads (or on first import)
// This might run multiple times if module caching behaves unexpectedly in some environments,
// but the IF NOT EXISTS clauses make it safe.
// Consider moving this to a more explicit startup phase of your application if needed.
(async () => {
    try {
        await initializeDatabaseSchema();
        // After schema initialization, attempt to set a default active dataset
        const names = await getAllDatasetNames();
        if (names.length > 0 && !activeDataset) {
            console.log(`[DB Service Initial Load] No active dataset, defaulting to first available: '${names[0]}'`);
            await setActiveDataset(names[0]);
        } else if (names.length === 0 && !activeDataset) {
            console.log(`[DB Service Initial Load] No datasets exist. Creating and setting 'demo' as active.`);
            await createOrReplaceDataset('demo', []); // Creates an empty 'demo' dataset and sets it active
        } else if (activeDataset) {
            console.log(`[DB Service Initial Load] Active dataset already set to '${activeDataset}'.`);
        }

    } catch (error) {
        console.error("[DB Service Initial Load] Critical error during initial schema/dataset setup:", error);
        // Depending on the application, you might want to exit or handle this more gracefully.
    }
})();

    