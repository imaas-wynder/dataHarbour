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
  console.log('addData service called with:', data);
  try {
    // Simulate potential failure for demonstration
    // const success = Math.random() > 0.1; // 90% success rate
    const success = true; // Let's assume success for now unless real error occurs
    await new Promise(resolve => setTimeout(resolve, 150)); // Simulate network delay

    if (success) {
       console.log('Simulated success in addData for:', data);
       if (Array.isArray(data)) {
        // Add each entry in the array
        data.forEach(entry => {
          // Assign a new ID only if one is not provided
          const newEntry = { ...entry, id: entry.id ?? nextId++ };
          simulatedDatabase.push(newEntry);
          console.log(`[addData] Added entry with ID: ${newEntry.id}`);
        });
       } else {
         // Add single entry
         // Assign a new ID only if one is not provided
         const newEntry = { ...data, id: data.id ?? nextId++ };
         simulatedDatabase.push(newEntry);
         console.log(`[addData] Added entry with ID: ${newEntry.id}`);
       }
       console.log('[addData] Current simulated DB size:', simulatedDatabase.length);
       console.log(`[addData] Current IDs in DB: [${simulatedDatabase.map(e => String(e.id)).join(', ')}]`);
       return true;
    } else {
       console.warn('Simulated failure in addData for:', data);
       return false;
    }
  } catch (error) {
    console.error('Error in addData service:', error);
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
   console.log('getAllData service called');
  try {
     console.log('Returning current simulated data from getAllData. Count:', simulatedDatabase.length);
     await new Promise(resolve => setTimeout(resolve, 300)); // Simulate network delay
     // Return a deep copy to prevent direct mutation of the simulated store
     return JSON.parse(JSON.stringify(simulatedDatabase));
   } catch (error) {
     console.error('Error in getAllData service:', error);
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
  const searchId = String(id); // Normalize search ID to string
  console.log(`[getDataById] Service called for ID: ${searchId}`);
  // --- Add Detailed Logging Here ---
  console.log(`[getDataById] Current simulatedDatabase state before search (IDs): [${simulatedDatabase.map(e => String(e.id)).join(', ')}]`);
  console.log(`[getDataById] Searching for ID: ${searchId} (Type: ${typeof searchId})`);
  // --- End Detailed Logging ---
  try {
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate network delay

    const entry = simulatedDatabase.find(entry => {
        const entryIdStr = String(entry.id);
        // Add logging inside the find callback for detailed comparison if needed
        // console.log(`[getDataById] Comparing: Stored ID "${entryIdStr}" (Type: ${typeof entryIdStr}) vs Search ID "${searchId}" (Type: ${typeof searchId})`);
        return entryIdStr === searchId;
    });


    if (entry) {
        console.log(`[getDataById] Found entry for ID ${searchId}:`, entry);
        // Return a deep copy to prevent modification of the stored object
        return JSON.parse(JSON.stringify(entry));
    } else {
        console.warn(`[getDataById] Entry not found for ID ${searchId}. This is expected if the server restarted (e.g., due to file changes/HMR) after the data was added, as the in-memory store was reset.`);
        return null;
    }
  } catch (error) {
    console.error(`[getDataById] Error fetching data for ID ${searchId}:`, error);
    if (error instanceof Error) {
      throw new Error(`Failed to fetch data for ID ${searchId}: ${error.message}`);
    }
    throw new Error(`An unknown error occurred while fetching data for ID ${searchId}.`);
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
    console.log(`updateDataById service called for ID: ${updateId} with data:`, updatedData);
    try {
        await new Promise(resolve => setTimeout(resolve, 200)); // Simulate network delay
        const index = simulatedDatabase.findIndex(entry => String(entry.id) === updateId);

        if (index !== -1) {
            // Merge existing data with updated data, ensuring ID remains unchanged
            const currentEntry = simulatedDatabase[index];
            // Make sure not to overwrite the ID with undefined from updatedData
            const dataToMerge = { ...updatedData };
            delete dataToMerge.id; // Remove id from payload if present, keep the original
            simulatedDatabase[index] = { ...currentEntry, ...dataToMerge };
            console.log('Updated entry:', simulatedDatabase[index]);
            return true;
        } else {
            console.log(`Entry not found for update (ID: ${updateId}).`);
            return false;
        }
    } catch (error) {
        console.error(`Error in updateDataById service for ID ${updateId}:`, error);
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
  console.log('replaceDatabase service called. New data count:', newData.length);
  try {
    await new Promise(resolve => setTimeout(resolve, 250)); // Simulate delay

    // Reset next ID counter - find the highest ID in the new data or default to 1
    let maxId = 0;
    newData.forEach(entry => {
        // Ensure ID is treated as a number for comparison if possible
        const numericId = Number(entry.id);
        if (!isNaN(numericId) && numericId > maxId) {
            maxId = numericId;
        } else if (typeof entry.id === 'string' && !isNaN(parseInt(entry.id, 10)) && parseInt(entry.id, 10) > maxId) {
            // Handle numeric string IDs
             maxId = parseInt(entry.id, 10);
        }
    });
    nextId = maxId + 1; // Set next ID to be one greater than the max found

    // Assign missing IDs and deep copy the new data
    const processedData = newData.map((entry, index) => ({
        ...entry,
        // Assign a new ID if missing or invalid, starting from the calculated nextId
        id: entry.id ?? (nextId + index) // Use nextId + index for entries without IDs
    }));
    // Update nextId if we assigned new ones
    nextId = Math.max(nextId, nextId + newData.filter(e => !e.id).length);


    // Replace the database
    simulatedDatabase = JSON.parse(JSON.stringify(processedData)); // Replace with a deep copy

    // Clear relationships and reset relationship ID counter
    simulatedRelationships = [];
    nextRelationshipId = 1;

    console.log('Database replaced. New size:', simulatedDatabase.length);
    console.log('Relationships cleared.');
    console.log('Next data ID set to:', nextId);
    console.log(`Current IDs in DB: [${simulatedDatabase.map(e => String(e.id)).join(', ')}]`);
    return true;
  } catch (error) {
    console.error('Error in replaceDatabase service:', error);
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
    console.log(`addRelationship service called: Source ${sourceIdStr}, Target ${targetIdStr}`);
    try {
        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate network delay

        // Basic validation: check if source and target entries exist in the current in-memory store
        const sourceExists = simulatedDatabase.some(entry => String(entry.id) === sourceIdStr);
        const targetExists = simulatedDatabase.some(entry => String(entry.id) === targetIdStr);

        if (!sourceExists || !targetExists) {
            console.warn(`Cannot add relationship: Source (${sourceIdStr}) or Target (${targetIdStr}) entry does not exist in current session. DB IDs: [${simulatedDatabase.map(e => String(e.id)).join(', ')}]`);
            return null; // Indicate failure due to non-existent entries
        }

        // Prevent duplicate relationships (source -> target)
        const existingRelationship = simulatedRelationships.find(
            rel => String(rel.source_entry_id) === sourceIdStr &&
                   String(rel.target_entry_id) === targetIdStr
        );

        if (existingRelationship) {
            console.warn(`Relationship from ${sourceIdStr} to ${targetIdStr} already exists.`);
            // Return existing one or null, depending on desired behavior. Returning existing for idempotency.
            return JSON.parse(JSON.stringify(existingRelationship));
        }

        // Prevent self-referencing relationships
         if (sourceIdStr === targetIdStr) {
            console.warn(`Cannot add self-referencing relationship for ID ${sourceIdStr}.`);
            return null;
         }


        const newRelationship: RelationshipEntry = {
            id: nextRelationshipId++,
            source_entry_id: sourceEntryId, // Keep original type if needed, but use string for comparison
            target_entry_id: targetEntryId, // Keep original type if needed
            created_at: new Date().toISOString(),
        };
        simulatedRelationships.push(newRelationship);
        console.log('Added new relationship:', newRelationship);
        console.log('Current simulated relationships count:', simulatedRelationships.length);
        return JSON.parse(JSON.stringify(newRelationship)); // Return a copy
    } catch (error) {
        console.error(`Error in addRelationship service for ${sourceIdStr} -> ${targetIdStr}:`, error);
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
    console.log(`getRelationshipsBySourceId service called for source ID: ${sourceIdStr}`);
    try {
        await new Promise(resolve => setTimeout(resolve, 150)); // Simulate network delay
        const relationships = simulatedRelationships.filter(
            rel => String(rel.source_entry_id) === sourceIdStr
        );
        console.log(`Found ${relationships.length} relationships for source ID ${sourceIdStr}`);
        return JSON.parse(JSON.stringify(relationships)); // Return a deep copy
    } catch (error) {
        console.error(`Error in getRelationshipsBySourceId service for source ID ${sourceIdStr}:`, error);
        if (error instanceof Error) {
            throw new Error(`Failed to fetch relationships for ID ${sourceIdStr}: ${error.message}`);
        }
        throw new Error(`An unknown error occurred while fetching relationships for ID ${sourceIdStr}.`);
    }
}

// NOTE: To fix data persistence issues, replace this entire file's implementation
// with code that interacts with a real, persistent database (e.g., PostgreSQL, Firestore).
// The in-memory arrays (`simulatedDatabase`, `simulatedRelationships`, `nextId`, `nextRelationshipId`)
// would be removed.
