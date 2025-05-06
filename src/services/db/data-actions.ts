import { QueryResult, QueryResultRow } from 'pg';
import { v4 as uuidv4 } from 'uuid';
//import { DataEntry, RelationshipEntry } from '../types';
import { SHOW_ALL_TABLES, SHOW_ALL_DATABASES, SHOW_ALL_RELATIONSHIPS } from './schema';

require('dotenv').config(); // Load environment variables from .env

const DATABASE_HOST = process.env.DATABASE_HOST
const DATABASE_PORT = process.env.DATABASE_PORT
const DATABASE_USER = process.env.DATABASE_USER
const DATABASE_PASSWORD = process.env.DATABASE_PASSWORD
const DATABASE_NAME = process.env.DATABASE_NAME

console.log("Database URL:", DATABASE_HOST, DATABASE_USER);

export type DataEntry = any
export async function addData({ data }: { data: DataEntry | DataEntry[]; }): Promise<boolean> {
    const currentActiveDataset = "demo";
    if (!currentActiveDataset) {
        return false;
    }

    const 
   try {
        await client.query('BEGIN');


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
        }

        return true;

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
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
export async function getAllData(activeDatasetName: string): Promise<DataEntry[]|any> {
    const currentActiveDataset = activeDatasetName; // Capture at the start
    if (!currentActiveDataset) {
        console.error('No active dataset selected.');
        return []
    }
    const client = await pool.connect();
    try {
        const result: QueryResult<{ entry_id: string; data: any }> = await client.query(
            'SELECT entry_id, data FROM data_entries WHERE dataset_name = $1 ORDER BY created_at DESC',
            [currentActiveDataset]);

        // Combine entry_id back into the data object
        const entries = result.rows.map(row => ({
            id: row.entry_id, // Use entry_id as the 'id' field
            ...row.data        // Spread the JSONB data
        }));

        return entries;
    } catch (error) {
        throw new Error(`Failed to fetch data from database: ${error.message}`);
    } finally {
        console.error(`Failed to fetch data from database: ${error.message}`);
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
export async function getDataById(activeDatasetName:string, id: number | string): Promise<DataEntry | null> {
    const currentActiveDataset = activeDatasetName; // Capture at the start
    if (!currentActiveDataset) {
         console.error('No active dataset selected.');
        return null
    }
    const searchId = String(id);

    const client = await pool.connect();
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
    console.error(`Failed to fetch data for ID ${searchId} from database: ${error.message}`);
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
export async function getDataByIds(activeDatasetName:string, ids: (number | string)[]): Promise<DataEntry[]> {
    const currentActiveDataset = activeDatasetName; // Capture at the start
    if (!currentActiveDataset) {
       console.error('No active dataset selected.');
        return []
    }
    const searchIds = ids.map(String);
    if (searchIds.length === 0) {
        return []; // Return empty array if no IDs are provided
    }

    const client = await pool.connect();
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
        console.error(`Failed to fetch multiple data entries from database: ${error.message}`);
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
export async function updateDataById(activeDatasetName:string, id: number | string, updatedData: Partial<DataEntry>): Promise<boolean> {
    const currentActiveDataset = activeDatasetName; // Capture at the start
    if (!currentActiveDataset) {
        console.error('No active dataset selected.');
    }
    const updateId = String(id);
    // Remove 'id' property from the data to be stored/merged in JSONB
    const { id: ignoredId, ...dataToUpdate } = updatedData;
    const dataJson = JSON.stringify(dataToUpdate);


    const client = await pool.connect();
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
            return false;
        }

       return true;
    } catch (error) {
        console.error(`Failed to update data for ID ${updateId} in database: ${error.message}`);
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
export async function addRelationship(activeDatasetName:string, sourceEntryId: number | string, targetEntryId: number | string): Promise<RelationshipEntry | null> {
    const currentActiveDataset = activeDatasetName; // Capture at the start
    if (!currentActiveDataset) {
        console.error('No active dataset selected.');
        return null
    }
    const sourceIdStr = String(sourceEntryId);
    const targetIdStr = String(targetEntryId);
   
    if (sourceIdStr === targetIdStr) {
        return null;
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check if source and target entries exist in the active dataset
        const checkSource = await client.query('SELECT 1 FROM data_entries WHERE dataset_name = $1 AND entry_id = $2', [currentActiveDataset, sourceIdStr]);
        const checkTarget = await client.query('SELECT 1 FROM data_entries WHERE dataset_name = $1 AND entry_id = $2', [currentActiveDataset, targetIdStr]);

        if (checkSource.rowCount === 0) {
            await client.query('ROLLBACK');
            return null;
        }
        if (checkTarget.rowCount === 0) {
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
        
        if (insertResult.rowCount > 0) {
            return insertResult.rows[0];
        }

        await client.query('COMMIT');
        return null;

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`Failed to add relationship ${sourceIdStr} -> ${targetIdStr} in database: ${error.message}`);
    } finally {
        client.release();
    }
}
export async function getAllRelationships(): Promise<any> {
    const client = await pool.connect();

    try {

        const relationshipsResult = await client.query(SHOW_ALL_RELATIONSHIPS);

        return relationshipsResult.rows;

    } catch (error) {
        console.error(error);
    } finally {
        client.release();
    }
}

export async function getAllPostgresItems(): Promise<any[]> {
    const client = await pool.connect();
    try {
        const tablesResult = await client.query(SHOW_ALL_TABLES);
        const databasesResult = await client.query(SHOW_ALL_DATABASES);
        const relationshipsResult = await client.query(SHOW_ALL_RELATIONSHIPS);
        return [tablesResult, databasesResult, relationshipsResult];
    } catch (error) {
        console.error(error);
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
export async function getRelationshipsBySourceId(activeDatasetName:string, sourceEntryId: number | string): Promise<RelationshipEntry[]> {
    const currentActiveDataset = activeDatasetName; // Capture at the start
    if (!currentActiveDataset) {
        console.error('No active dataset selected.');
        return []
    }
    const sourceIdStr = String(sourceEntryId);

    const client = await pool.connect();
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
        throw new Error(`Failed to fetch relationships for ID ${sourceIdStr} from database: ${error.message}`);
    }finally{
        console.error(`Failed to fetch relationships for ID ${sourceIdStr} from database: ${error.message}`);
        client.release();
    }}
