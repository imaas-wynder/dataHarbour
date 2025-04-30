/**
 * Represents a data entry to be stored in the database.
 * Structure can be flexible.
 */
export interface DataEntry {
  id?: number | string; // Optional ID, might be assigned by DB
  [key: string]: any; // Allows for dynamic keys and any value type
}

/**
 * Represents a relationship between two data entries.
 */
export interface RelationshipEntry {
    id?: number; // Primary key for the relationship itself
    source_entry_id: number | string;
    target_entry_id: number | string;
    created_at?: string | Date;
}


// ========================================================================
// ==                         IMPORTANT NOTE                           ==
// ========================================================================
// This service uses an **IN-MEMORY** simulated database.
// - Data added or modified using `addData`, `updateDataById`, `addRelationship`
//   is stored ONLY in the server's memory for the current session.
// - **ALL CHANGES WILL BE LOST** whenever the server restarts. This includes:
//    - Stopping and starting the development server (`npm run dev`).
//    - Automatic server restarts caused by file changes during development (hot-reloading).
// - The initial `simulatedDatabase` array provides starting data that persists
//   across restarts (because it's hardcoded), but any runtime additions do not.
// - For persistent storage, replace this simulated implementation with a connection
//   to a real database (e.g., PostgreSQL, Firestore, MongoDB).
// ========================================================================

let simulatedDatabase: DataEntry[] = [
   { id: 1, name: 'Simulated Example Data', value: 123, timestamp: new Date().toISOString(), details: 'Some initial details' },
   { id: 2, name: 'Another Simulated Entry', value: 456, category: 'Test', timestamp: new Date().toISOString(), email: ' test@example.com ', inconsistent_value: ' yes '},
   { id: 3, complex: { nested: true, arr: [1, 2] }, description: 'Complex object example', timestamp: new Date().toISOString(), status: 'pending' },
 ];
let nextId = 4; // Next ID to assign for new entries

let simulatedRelationships: RelationshipEntry[] = [];
let nextRelationshipId = 1; // Next ID for new relationships

/**
 * Asynchronously adds a data entry to the simulated database.
 * IMPORTANT: Adds data to the in-memory array for the *current* server session only.
 * Data will be lost if the server restarts.
 *
 * @param data The data entry or array of entries to add.
 * @returns A promise that resolves to true if the operation was successful, false otherwise.
 */
export async function addData(data: DataEntry | DataEntry[]): Promise<boolean> {
  console.log('[addData Service] Called with:', JSON.stringify(data).substring(0, 100) + '...');
  try {
    await new Promise(resolve => setTimeout(resolve, 150)); // Simulate network delay

    if (Array.isArray(data)) {
        data.forEach(entry => {
            // Assign new ID only if one isn't provided
            const newEntry = { ...entry, id: entry.id ?? nextId++ };
            simulatedDatabase.push(newEntry);
            console.log(`[addData Service] Added entry with ID: ${newEntry.id}`);
        });
    } else {
        const newEntry = { ...data, id: data.id ?? nextId++ };
        simulatedDatabase.push(newEntry);
        console.log(`[addData Service] Added entry with ID: ${newEntry.id}`);
    }
    console.log('[addData Service] Current simulated DB size:', simulatedDatabase.length);
    console.log(`[addData Service] Current IDs in DB: [${simulatedDatabase.map(e => String(e.id)).join(', ')}]`);
    return true;

  } catch (error) {
    console.error('[addData Service] Error:', error);
    return false;
  }
}

/**
 * Asynchronously fetches all data entries from the simulated database.
 * Retrieves data currently held in the in-memory store for the active server session.
 *
 * @returns A promise that resolves to an array of DataEntry objects.
 * @throws {Error} If the operation fails.
 */
export async function getAllData(): Promise<DataEntry[]> {
   console.log('[getAllData Service] Called');
  try {
     console.log('[getAllData Service] Returning current simulated data. Count:', simulatedDatabase.length);
     await new Promise(resolve => setTimeout(resolve, 300)); // Simulate network delay
     return JSON.parse(JSON.stringify(simulatedDatabase));
   } catch (error) {
     console.error('[getAllData Service] Error:', error);
     if (error instanceof Error) {
       throw new Error(`Failed to fetch data: ${error.message}`);
     }
     throw new Error('An unknown error occurred while fetching data.');
   }
}

/**
 * Asynchronously fetches a single data entry by its ID from the simulated database.
 * Retrieves data currently held in the in-memory store for the active server session.
 * If you get a 404 for newly added data, ensure the server hasn't restarted since adding it.
 *
 * @param id The ID of the data entry to fetch (can be string from URL param or number).
 * @returns A promise that resolves to the DataEntry object or null if not found.
 * @throws {Error} If the operation fails.
 */
export async function getDataById(id: number | string): Promise<DataEntry | null> {
  const searchId = String(id);
  console.log(`[getDataById Service] Called for ID: ${searchId}`);
  console.log(`[getDataById Service] Current simulatedDatabase state before search (IDs): [${simulatedDatabase.map(e => String(e.id)).join(', ')}]`);
  try {
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate network delay

    const entry = simulatedDatabase.find(entry => {
        const entryIdStr = String(entry.id);
        //console.log(`[getDataById Service] Comparing: Stored ID "${entryIdStr}" (Type: ${typeof entryIdStr}) vs Search ID "${searchId}" (Type: ${typeof searchId}) => Match: ${entryIdStr === searchId}`);
        return entryIdStr === searchId;
    });

    if (entry) {
        console.log(`[getDataById Service] Found entry for ID ${searchId}.`);
        return JSON.parse(JSON.stringify(entry));
    } else {
        console.warn(`[getDataById Service] Entry not found for ID ${searchId}. Current DB IDs: [${simulatedDatabase.map(e => String(e.id)).join(', ')}]. This is expected if the server restarted after data was added.`);
        return null;
    }
  } catch (error) {
    console.error(`[getDataById Service] Error fetching data for ID ${searchId}:`, error);
    if (error instanceof Error) {
      throw new Error(`Failed to fetch data for ID ${searchId}: ${error.message}`);
    }
    throw new Error(`An unknown error occurred while fetching data for ID ${searchId}.`);
  }
}

/**
 * Asynchronously fetches multiple data entries by their IDs from the simulated database.
 * Retrieves data currently held in the in-memory store for the active server session.
 *
 * @param ids An array of IDs (string or number) of the data entries to fetch.
 * @returns A promise that resolves to an array of DataEntry objects found.
 * @throws {Error} If the operation fails.
 */
export async function getDataByIds(ids: (number | string)[]): Promise<DataEntry[]> {
  const searchIds = ids.map(String); // Normalize all search IDs to strings
  console.log(`[getDataByIds Service] Called for IDs: [${searchIds.join(', ')}]`);
  console.log(`[getDataByIds Service] Current simulatedDatabase state before search (IDs): [${simulatedDatabase.map(e => String(e.id)).join(', ')}]`);
  try {
    await new Promise(resolve => setTimeout(resolve, 150)); // Simulate network delay

    const entries = simulatedDatabase.filter(entry => {
        const entryIdStr = String(entry.id);
        const isIncluded = searchIds.includes(entryIdStr);
        // console.log(`[getDataByIds Service] Checking entry ID "${entryIdStr}": Included in [${searchIds.join(', ')}]? ${isIncluded}`);
        return isIncluded;
    });

    console.log(`[getDataByIds Service] Found ${entries.length} entries for IDs [${searchIds.join(', ')}].`);
    return JSON.parse(JSON.stringify(entries));
  } catch (error) {
    console.error(`[getDataByIds Service] Error fetching data for IDs [${searchIds.join(', ')}]:`, error);
    if (error instanceof Error) {
      throw new Error(`Failed to fetch data for multiple IDs: ${error.message}`);
    }
    throw new Error('An unknown error occurred while fetching data for multiple IDs.');
  }
}


/**
 * Asynchronously updates a data entry by its ID in the simulated database.
 * Updates data currently held in the in-memory store for the active server session.
 * Changes will be lost if the server restarts.
 *
 * @param id The ID of the data entry to update.
 * @param updatedData The partial or full data to update the entry with.
 * @returns A promise that resolves to true if the update was successful, false otherwise.
 * @throws {Error} If the operation fails.
 */
export async function updateDataById(id: number | string, updatedData: Partial<DataEntry>): Promise<boolean> {
    const updateId = String(id);
    console.log(`[updateDataById Service] Called for ID: ${updateId} with data:`, JSON.stringify(updatedData).substring(0, 100) + '...');
    try {
        await new Promise(resolve => setTimeout(resolve, 200)); // Simulate network delay
        const index = simulatedDatabase.findIndex(entry => String(entry.id) === updateId);

        if (index !== -1) {
            const currentEntry = simulatedDatabase[index];
            const dataToMerge = { ...updatedData };
            delete dataToMerge.id; // Ensure we don't overwrite the ID with undefined if it was in updatedData
            simulatedDatabase[index] = { ...currentEntry, ...dataToMerge };
            console.log('[updateDataById Service] Successfully updated entry:', simulatedDatabase[index]);
            return true;
        } else {
            console.warn(`[updateDataById Service] Entry not found for update (ID: ${updateId}). Current DB IDs: [${simulatedDatabase.map(e => String(e.id)).join(', ')}]`);
            return false;
        }
    } catch (error) {
        console.error(`[updateDataById Service] Error for ID ${updateId}:`, error);
        if (error instanceof Error) {
            throw new Error(`Failed to update data for ID ${updateId}: ${error.message}`);
        }
        throw new Error(`An unknown error occurred while updating data for ID ${updateId}.`);
    }
}

/**
 * Replaces the entire in-memory database with the provided data set.
 * Resets the relationships table and the next ID counter.
 * IMPORTANT: This operation is destructive and data will be lost on server restart.
 *
 * @param newData The array of DataEntry objects to set as the new database content.
 * @returns A promise that resolves to true if the replacement was successful, false otherwise.
 */
export async function replaceDatabase(newData: DataEntry[]): Promise<boolean> {
  console.log('[replaceDatabase Service] Called. New data count:', newData.length);
  try {
    await new Promise(resolve => setTimeout(resolve, 250)); // Simulate delay

    let maxId = 0;
    // Determine the highest numeric ID in the incoming data to set the nextId correctly
    newData.forEach(entry => {
        if (entry.id !== undefined && entry.id !== null) {
            const numericId = Number(entry.id);
            if (!isNaN(numericId) && numericId > maxId) {
                maxId = numericId;
            }
        }
    });
    nextId = maxId + 1; // Start next ID after the max found ID

    // Assign IDs to entries that don't have one, starting from the calculated nextId
    const processedData = newData.map((entry) => {
        if (entry.id === undefined || entry.id === null) {
            return { ...entry, id: nextId++ };
        }
        return { ...entry }; // Keep existing ID
    });

    simulatedDatabase = JSON.parse(JSON.stringify(processedData)); // Deep copy

    simulatedRelationships = [];
    nextRelationshipId = 1;

    console.log('[replaceDatabase Service] Database replaced. New size:', simulatedDatabase.length);
    console.log('[replaceDatabase Service] Relationships cleared.');
    console.log('[replaceDatabase Service] Next data ID set to:', nextId);
    console.log(`[replaceDatabase Service] Current IDs in DB: [${simulatedDatabase.map(e => String(e.id)).join(', ')}]`);
    return true;
  } catch (error) {
    console.error('[replaceDatabase Service] Error:', error);
    return false;
  }
}


/**
 * Asynchronously adds a relationship between two data entries in the simulated store.
 * Relationships added here are in-memory and will be lost on server restart.
 *
 * @param sourceEntryId The ID of the source entry.
 * @param targetEntryId The ID of the target entry to relate.
 * @returns A promise that resolves to the newly created RelationshipEntry or null if failed.
 * @throws {Error} If the operation fails.
 */
export async function addRelationship(sourceEntryId: number | string, targetEntryId: number | string): Promise<RelationshipEntry | null> {
    const sourceIdStr = String(sourceEntryId);
    const targetIdStr = String(targetEntryId);
    console.log(`[addRelationship Service] Called: Source ${sourceIdStr}, Target ${targetIdStr}`);
    console.log(`[addRelationship Service] Current relationships before add:`, JSON.stringify(simulatedRelationships));
    try {
        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate network delay

        // Verify both source and target entries exist in the current data
        const sourceExists = simulatedDatabase.some(entry => String(entry.id) === sourceIdStr);
        const targetExists = simulatedDatabase.some(entry => String(entry.id) === targetIdStr);

        if (!sourceExists) {
            console.warn(`[addRelationship Service] Failed: Source entry ID ${sourceIdStr} not found. Current DB IDs: [${simulatedDatabase.map(e => String(e.id)).join(', ')}]`);
            return null;
        }
        if (!targetExists) {
             console.warn(`[addRelationship Service] Failed: Target entry ID ${targetIdStr} not found. Current DB IDs: [${simulatedDatabase.map(e => String(e.id)).join(', ')}]`);
             return null;
        }

         // Check for self-referencing relationship
        if (sourceIdStr === targetIdStr) {
            console.warn(`[addRelationship Service] Failed: Cannot add self-referencing relationship for ID ${sourceIdStr}.`);
            return null;
        }

        // Check if this exact relationship already exists
        const existingRelationship = simulatedRelationships.find(
            rel => String(rel.source_entry_id) === sourceIdStr &&
                   String(rel.target_entry_id) === targetIdStr
        );

        if (existingRelationship) {
            console.warn(`[addRelationship Service] Relationship from ${sourceIdStr} to ${targetIdStr} already exists. Returning existing.`);
            return JSON.parse(JSON.stringify(existingRelationship)); // Return copy of existing
        }


        // Create and add the new relationship
        const newRelationship: RelationshipEntry = {
            id: nextRelationshipId++,
            source_entry_id: sourceEntryId, // Store original type if needed, but compare as strings
            target_entry_id: targetEntryId,
            created_at: new Date().toISOString(),
        };
        simulatedRelationships.push(newRelationship);
        console.log('[addRelationship Service] Successfully added new relationship:', newRelationship);
        console.log('[addRelationship Service] Current simulated relationships count:', simulatedRelationships.length);
        console.log(`[addRelationship Service] Current relationships after add:`, JSON.stringify(simulatedRelationships));
        return JSON.parse(JSON.stringify(newRelationship)); // Return a deep copy
    } catch (error) {
        console.error(`[addRelationship Service] Error for ${sourceIdStr} -> ${targetIdStr}:`, error);
        if (error instanceof Error) {
            throw new Error(`Failed to add relationship: ${error.message}`);
        }
        throw new Error('An unknown error occurred while adding the relationship.');
    }
}

/**
 * Asynchronously fetches all relationships originating from a specific source entry ID
 * from the simulated in-memory store.
 *
 * @param sourceEntryId The ID of the source entry.
 * @returns A promise that resolves to an array of RelationshipEntry objects found in the current session.
 * @throws {Error} If the operation fails.
 */
export async function getRelationshipsBySourceId(sourceEntryId: number | string): Promise<RelationshipEntry[]> {
    const sourceIdStr = String(sourceEntryId);
    console.log(`[getRelationshipsBySourceId Service] Called for source ID: ${sourceIdStr}`);
    try {
        await new Promise(resolve => setTimeout(resolve, 150)); // Simulate network delay
        const relationships = simulatedRelationships.filter(
            rel => String(rel.source_entry_id) === sourceIdStr
        );
        console.log(`[getRelationshipsBySourceId Service] Found ${relationships.length} relationships for source ID ${sourceIdStr}`);
        return JSON.parse(JSON.stringify(relationships));
    } catch (error) {
        console.error(`[getRelationshipsBySourceId Service] Error for source ID ${sourceIdStr}:`, error);
        if (error instanceof Error) {
            throw new Error(`Failed to fetch relationships for ID ${sourceIdStr}: ${error.message}`);
        }
        throw new Error(`An unknown error occurred while fetching relationships for ID ${sourceIdStr}.`);
    }
}


/**
 * Asynchronously fetches all relationships from the simulated in-memory store.
 *
 * @returns A promise that resolves to an array of all RelationshipEntry objects.
 * @throws {Error} If the operation fails.
 */
export async function getAllRelationships(): Promise<RelationshipEntry[]> {
    console.log('[getAllRelationships Service] Called');
    try {
        await new Promise(resolve => setTimeout(resolve, 150)); // Simulate network delay
        console.log(`[getAllRelationships Service] Returning ${simulatedRelationships.length} relationships.`);
        return JSON.parse(JSON.stringify(simulatedRelationships));
    } catch (error) {
        console.error('[getAllRelationships Service] Error:', error);
        if (error instanceof Error) {
            throw new Error(`Failed to fetch all relationships: ${error.message}`);
        }
        throw new Error('An unknown error occurred while fetching all relationships.');
    }
}


// NOTE: To fix data persistence issues, replace this entire file's implementation
// with code that interacts with a real, persistent database (e.g., PostgreSQL, Firestore).
// The in-memory arrays (`simulatedDatabase`, `simulatedRelationships`, `nextId`, `nextRelationshipId`)
// would be removed.
