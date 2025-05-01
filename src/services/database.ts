
import { DataEntry, RelationshipEntry } from './types'; // Import types from a separate file

// ========================================================================
// ==                         IMPORTANT NOTE                           ==
// ========================================================================
// This service uses an **IN-MEMORY** simulated database.
// - Data added or modified is stored ONLY in the server's memory.
// - **ALL CHANGES WILL BE LOST** whenever the server restarts.
// - For persistent storage, replace this simulated implementation.
// ========================================================================


/**
 * Structure to hold data and relationships for a single named dataset.
 */
interface Dataset {
    data: DataEntry[];
    relationships: RelationshipEntry[];
    nextDataId: number;
    nextRelationshipId: number;
}

// Store multiple datasets, identified by unique names
let datasets: Map<string, Dataset> = new Map();
// Name of the currently active dataset for operations
let activeDatasetName: string | null = null;

// --- Initialization ---

/**
 * Calculates the next available ID based on the maximum numeric ID found in the data.
 * @param data Array of DataEntry objects.
 * @returns The next integer ID to use.
 */
function calculateNextId(data: DataEntry[]): number {
    let maxId = 0;
    data.forEach(entry => {
        if (entry.id !== undefined && entry.id !== null) {
            const numericId = Number(entry.id);
            if (!isNaN(numericId) && Number.isInteger(numericId) && numericId > maxId) {
                maxId = numericId;
            }
        }
    });
    return maxId + 1;
}

/**
 * Initializes the default dataset if no datasets exist.
 */
function initializeDefaultDataset() {
    if (datasets.size === 0) {
        console.log('[Database Service] Initializing default dataset...');
        const initialDefaultData: DataEntry[] = [
            { id: 1, name: 'Simulated Example Data', value: 123, timestamp: new Date().toISOString(), details: 'Some initial details' },
            { id: 2, name: 'Another Simulated Entry', value: 456, category: 'Test', timestamp: new Date().toISOString(), email: ' test@example.com ', inconsistent_value: ' yes '},
            { id: 3, complex: { nested: true, arr: [1, 2] }, description: 'Complex object example', timestamp: new Date().toISOString(), status: 'pending' },
        ];
        const initialDefaultRelationships: RelationshipEntry[] = [];
        const nextDataId = calculateNextId(initialDefaultData);
        const nextRelationshipId = 1; // Assuming relationships start at 1

        datasets.set("default", {
            data: JSON.parse(JSON.stringify(initialDefaultData)),
            relationships: JSON.parse(JSON.stringify(initialDefaultRelationships)),
            nextDataId: nextDataId,
            nextRelationshipId: nextRelationshipId
        });
        activeDatasetName = "default";
        console.log(`[Database Service] Default dataset 'default' created. Active dataset set to 'default'. Next data ID: ${nextDataId}`);
    } else if (!activeDatasetName || !datasets.has(activeDatasetName)) {
        // If there are datasets but no active one (or active one is invalid), set the first one as active
        activeDatasetName = datasets.keys().next().value || null;
        console.log(`[Database Service] Setting active dataset to '${activeDatasetName}'`);
    }
}

// Initialize on load
initializeDefaultDataset();

// --- Helper Functions ---

/**
 * Gets the currently active dataset object.
 * @returns The active Dataset object or null if no dataset is active or found.
 */
function getActiveDataset(): Dataset | null {
    if (!activeDatasetName) {
        console.warn('[Database Service] No active dataset selected.');
        // Attempt to set a default if possible
        if (datasets.size > 0) {
             setActiveDataset(datasets.keys().next().value);
             if(activeDatasetName) return datasets.get(activeDatasetName) ?? null;
        }
        return null;
    }
    const dataset = datasets.get(activeDatasetName);
    if (!dataset) {
        console.error(`[Database Service] Active dataset '${activeDatasetName}' not found in map.`);
        // Attempt recovery: set active name to null and try to initialize/set a default
        activeDatasetName = null;
        initializeDefaultDataset(); // This might set a new active dataset
        if(activeDatasetName) return datasets.get(activeDatasetName) ?? null;
        return null;
    }
    return dataset;
}

// --- Public API ---

/**
 * Sets the active dataset for subsequent operations.
 * @param name The name of the dataset to activate.
 * @returns True if the dataset exists and was set as active, false otherwise.
 */
export async function setActiveDataset(name: string): Promise<boolean> {
    console.log(`[setActiveDataset Service] Attempting to set active dataset to: ${name}`);
    await new Promise(resolve => setTimeout(resolve, 50)); // Simulate async
    if (datasets.has(name)) {
        activeDatasetName = name;
        console.log(`[setActiveDataset Service] Active dataset is now: ${activeDatasetName}`);
        return true;
    } else {
        console.warn(`[setActiveDataset Service] Dataset '${name}' not found. Active dataset remains '${activeDatasetName}'.`);
        return false;
    }
}

/**
 * Gets the name of the currently active dataset.
 * @returns The name of the active dataset or null if none is active.
 */
export async function getActiveDatasetName(): Promise<string | null> {
     console.log(`[getActiveDatasetName Service] Returning active dataset name: ${activeDatasetName}`);
    return activeDatasetName;
}

/**
 * Gets the names of all available datasets.
 * @returns A promise resolving to an array of dataset names.
 */
export async function getAllDatasetNames(): Promise<string[]> {
    console.log('[getAllDatasetNames Service] Fetching all dataset names...');
    await new Promise(resolve => setTimeout(resolve, 50)); // Simulate async
    const names = Array.from(datasets.keys());
    console.log(`[getAllDatasetNames Service] Returning names: [${names.join(', ')}]`);
    return names;
}

/**
 * Creates a new, empty dataset or replaces an existing one with the provided initial data.
 * Sets the newly created/replaced dataset as the active one.
 *
 * @param name The name for the new dataset.
 * @param initialData The initial array of DataEntry objects for the dataset.
 * @returns A promise resolving to true if creation/replacement was successful, false otherwise.
 */
export async function createOrReplaceDataset(name: string, initialData: DataEntry[]): Promise<boolean> {
    console.log(`[createOrReplaceDataset Service] Called for name: ${name}. Initial data count: ${initialData.length}`);
    try {
        await new Promise(resolve => setTimeout(resolve, 250)); // Simulate delay

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
             console.error('[createOrReplaceDataset Service] Invalid dataset name provided.');
             return false;
        }
        const trimmedName = name.trim();

        // Calculate next ID based on the provided initial data
        const nextDataId = calculateNextId(initialData);

        // Assign IDs to entries that don't have one, using a mutable copy
        let currentNextId = nextDataId;
        const processedData = initialData.map(entry => {
            if (entry.id === undefined || entry.id === null) {
                 // Create a new object to avoid mutating the original `initialData` array elements
                return { ...entry, id: currentNextId++ };
            }
             // Create a new object even if ID exists to ensure deep copy
            return { ...entry };
        });

         // Create the new dataset structure
         const newDataset: Dataset = {
             data: JSON.parse(JSON.stringify(processedData)), // Deep copy processed data
             relationships: [],
             nextDataId: currentNextId, // Use the updated next ID counter
             nextRelationshipId: 1
         };

         datasets.set(trimmedName, newDataset);
         activeDatasetName = trimmedName; // Set the new dataset as active

         console.log(`[createOrReplaceDataset Service] Dataset '${trimmedName}' created/replaced and set as active.`);
         console.log(`[createOrReplaceDataset Service] New dataset size: ${newDataset.data.length}, Relationships: ${newDataset.relationships.length}`);
         console.log(`[createOrReplaceDataset Service] Next data ID for '${trimmedName}': ${newDataset.nextDataId}`);
         console.log(`[createOrReplaceDataset Service] Total datasets now: ${datasets.size}`);
         return true;
    } catch (error) {
        console.error(`[createOrReplaceDataset Service] Error creating/replacing dataset '${name}':`, error);
        return false;
    }
}


/**
 * Asynchronously adds a data entry to the *active* simulated dataset.
 * Data will be lost if the server restarts.
 *
 * @param data The data entry or array of entries to add.
 * @returns A promise that resolves to true if the operation was successful, false otherwise.
 */
export async function addData(data: DataEntry | DataEntry[]): Promise<boolean> {
  const activeDataset = getActiveDataset();
  if (!activeDataset) {
      console.error('[addData Service] Cannot add data, no active dataset.');
      return false;
  }
  console.log(`[addData Service - Active: ${activeDatasetName}] Called with data:`, JSON.stringify(data).substring(0, 100) + '...');

  try {
    await new Promise(resolve => setTimeout(resolve, 150)); // Simulate network delay

    if (Array.isArray(data)) {
        data.forEach(entry => {
            const newEntry = { ...entry, id: entry.id ?? activeDataset.nextDataId++ };
            activeDataset.data.push(newEntry);
            console.log(`[addData Service - Active: ${activeDatasetName}] Added entry with ID: ${newEntry.id}`);
        });
    } else {
        const newEntry = { ...data, id: data.id ?? activeDataset.nextDataId++ };
        activeDataset.data.push(newEntry);
        console.log(`[addData Service - Active: ${activeDatasetName}] Added entry with ID: ${newEntry.id}`);
    }
    console.log(`[addData Service - Active: ${activeDatasetName}] Current data count: ${activeDataset.data.length}. Next ID: ${activeDataset.nextDataId}`);
    console.log(`[addData Service - Active: ${activeDatasetName}] Current IDs: [${activeDataset.data.map(e => String(e.id)).join(', ')}]`);
    return true;

  } catch (error) {
    console.error(`[addData Service - Active: ${activeDatasetName}] Error:`, error);
    return false;
  }
}

/**
 * Asynchronously fetches all data entries from the *active* simulated dataset.
 *
 * @returns A promise that resolves to an array of DataEntry objects from the active dataset.
 * @throws {Error} If the operation fails or no dataset is active.
 */
export async function getAllData(): Promise<DataEntry[]> {
   const activeDataset = getActiveDataset();
   if (!activeDataset) {
       console.error('[getAllData Service] No active dataset to fetch from.');
       throw new Error('No active dataset selected.');
   }
   console.log(`[getAllData Service - Active: ${activeDatasetName}] Called`);
   try {
     console.log(`[getAllData Service - Active: ${activeDatasetName}] Returning ${activeDataset.data.length} entries.`);
     await new Promise(resolve => setTimeout(resolve, 300)); // Simulate network delay
     return JSON.parse(JSON.stringify(activeDataset.data));
   } catch (error) {
     console.error(`[getAllData Service - Active: ${activeDatasetName}] Error:`, error);
     if (error instanceof Error) {
       throw new Error(`Failed to fetch data: ${error.message}`);
     }
     throw new Error('An unknown error occurred while fetching data.');
   }
}

/**
 * Asynchronously fetches a single data entry by its ID from the *active* simulated dataset.
 *
 * @param id The ID of the data entry to fetch.
 * @returns A promise that resolves to the DataEntry object or null if not found.
 * @throws {Error} If the operation fails or no dataset is active.
 */
export async function getDataById(id: number | string): Promise<DataEntry | null> {
    const activeDataset = getActiveDataset();
    if (!activeDataset) {
        console.error(`[getDataById Service] No active dataset to fetch from.`);
        throw new Error('No active dataset selected.');
    }
    const searchId = String(id);
    console.log(`[getDataById Service - Active: ${activeDatasetName}] Called for ID: ${searchId}`);
    console.log(`[getDataById Service - Active: ${activeDatasetName}] Data IDs: [${activeDataset.data.map(e => String(e.id)).join(', ')}]`);
    try {
        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate network delay
        const entry = activeDataset.data.find(entry => String(entry.id) === searchId);

        if (entry) {
            console.log(`[getDataById Service - Active: ${activeDatasetName}] Found entry for ID ${searchId}.`);
            return JSON.parse(JSON.stringify(entry));
        } else {
            console.warn(`[getDataById Service - Active: ${activeDatasetName}] Entry not found for ID ${searchId}.`);
            return null;
        }
    } catch (error) {
        console.error(`[getDataById Service - Active: ${activeDatasetName}] Error for ID ${searchId}:`, error);
        if (error instanceof Error) {
            throw new Error(`Failed to fetch data for ID ${searchId}: ${error.message}`);
        }
        throw new Error(`An unknown error occurred while fetching data for ID ${searchId}.`);
    }
}

/**
 * Asynchronously fetches multiple data entries by their IDs from the *active* simulated dataset.
 *
 * @param ids An array of IDs of the data entries to fetch.
 * @returns A promise that resolves to an array of DataEntry objects found.
 * @throws {Error} If the operation fails or no dataset is active.
 */
export async function getDataByIds(ids: (number | string)[]): Promise<DataEntry[]> {
    const activeDataset = getActiveDataset();
    if (!activeDataset) {
        console.error(`[getDataByIds Service] No active dataset to fetch from.`);
        throw new Error('No active dataset selected.');
    }
    const searchIds = ids.map(String);
    console.log(`[getDataByIds Service - Active: ${activeDatasetName}] Called for IDs: [${searchIds.join(', ')}]`);
    console.log(`[getDataByIds Service - Active: ${activeDatasetName}] Data IDs: [${activeDataset.data.map(e => String(e.id)).join(', ')}]`);
    try {
        await new Promise(resolve => setTimeout(resolve, 150)); // Simulate network delay
        const entries = activeDataset.data.filter(entry => searchIds.includes(String(entry.id)));

        console.log(`[getDataByIds Service - Active: ${activeDatasetName}] Found ${entries.length} entries for IDs [${searchIds.join(', ')}].`);
        return JSON.parse(JSON.stringify(entries));
    } catch (error) {
        console.error(`[getDataByIds Service - Active: ${activeDatasetName}] Error for IDs [${searchIds.join(', ')}]:`, error);
        if (error instanceof Error) {
            throw new Error(`Failed to fetch data for multiple IDs: ${error.message}`);
        }
        throw new Error('An unknown error occurred while fetching data for multiple IDs.');
    }
}

/**
 * Asynchronously updates a data entry by its ID in the *active* simulated dataset.
 *
 * @param id The ID of the data entry to update.
 * @param updatedData The partial or full data to update the entry with.
 * @returns A promise that resolves to true if the update was successful, false otherwise.
 * @throws {Error} If the operation fails or no dataset is active.
 */
export async function updateDataById(id: number | string, updatedData: Partial<DataEntry>): Promise<boolean> {
    const activeDataset = getActiveDataset();
    if (!activeDataset) {
        console.error(`[updateDataById Service] Cannot update data, no active dataset.`);
        throw new Error('No active dataset selected.');
    }
    const updateId = String(id);
    console.log(`[updateDataById Service - Active: ${activeDatasetName}] Called for ID: ${updateId} with data:`, JSON.stringify(updatedData).substring(0, 100) + '...');
    try {
        await new Promise(resolve => setTimeout(resolve, 200)); // Simulate network delay
        const index = activeDataset.data.findIndex(entry => String(entry.id) === updateId);

        if (index !== -1) {
            const currentEntry = activeDataset.data[index];
            const dataToMerge = { ...updatedData };
            delete dataToMerge.id; // Ensure we don't overwrite the ID
            activeDataset.data[index] = { ...currentEntry, ...dataToMerge };
            console.log(`[updateDataById Service - Active: ${activeDatasetName}] Successfully updated entry:`, activeDataset.data[index]);
            return true;
        } else {
            console.warn(`[updateDataById Service - Active: ${activeDatasetName}] Entry not found for update (ID: ${updateId}).`);
            return false;
        }
    } catch (error) {
        console.error(`[updateDataById Service - Active: ${activeDatasetName}] Error for ID ${updateId}:`, error);
        if (error instanceof Error) {
            throw new Error(`Failed to update data for ID ${updateId}: ${error.message}`);
        }
        throw new Error(`An unknown error occurred while updating data for ID ${updateId}.`);
    }
}


/**
 * Asynchronously adds a relationship between two data entries in the *active* simulated dataset.
 *
 * @param sourceEntryId The ID of the source entry.
 * @param targetEntryId The ID of the target entry.
 * @returns A promise that resolves to the newly created RelationshipEntry or null if failed.
 * @throws {Error} If the operation fails or no dataset is active.
 */
export async function addRelationship(sourceEntryId: number | string, targetEntryId: number | string): Promise<RelationshipEntry | null> {
    const activeDataset = getActiveDataset();
    if (!activeDataset) {
        console.error(`[addRelationship Service] Cannot add relationship, no active dataset.`);
        throw new Error('No active dataset selected.');
    }
    const sourceIdStr = String(sourceEntryId);
    const targetIdStr = String(targetEntryId);
    console.log(`[addRelationship Service - Active: ${activeDatasetName}] Called: Source ${sourceIdStr}, Target ${targetIdStr}`);
    console.log(`[addRelationship Service - Active: ${activeDatasetName}] Relationships before:`, JSON.stringify(activeDataset.relationships));
    try {
        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate network delay

        const sourceExists = activeDataset.data.some(entry => String(entry.id) === sourceIdStr);
        const targetExists = activeDataset.data.some(entry => String(entry.id) === targetIdStr);

        if (!sourceExists) {
            console.warn(`[addRelationship Service - Active: ${activeDatasetName}] Failed: Source ID ${sourceIdStr} not found.`);
            return null;
        }
        if (!targetExists) {
             console.warn(`[addRelationship Service - Active: ${activeDatasetName}] Failed: Target ID ${targetIdStr} not found.`);
             return null;
        }
        if (sourceIdStr === targetIdStr) {
            console.warn(`[addRelationship Service - Active: ${activeDatasetName}] Failed: Cannot add self-referencing relationship for ID ${sourceIdStr}.`);
            return null;
        }

        const existingRelationship = activeDataset.relationships.find(
            rel => String(rel.source_entry_id) === sourceIdStr && String(rel.target_entry_id) === targetIdStr
        );

        if (existingRelationship) {
            console.warn(`[addRelationship Service - Active: ${activeDatasetName}] Relationship ${sourceIdStr} -> ${targetIdStr} already exists.`);
            return JSON.parse(JSON.stringify(existingRelationship));
        }

        const newRelationship: RelationshipEntry = {
            id: activeDataset.nextRelationshipId++,
            source_entry_id: sourceEntryId,
            target_entry_id: targetEntryId,
            created_at: new Date().toISOString(),
        };
        activeDataset.relationships.push(newRelationship);
        console.log(`[addRelationship Service - Active: ${activeDatasetName}] Successfully added relationship:`, newRelationship);
        console.log(`[addRelationship Service - Active: ${activeDatasetName}] Relationships count: ${activeDataset.relationships.length}. Next ID: ${activeDataset.nextRelationshipId}`);
        console.log(`[addRelationship Service - Active: ${activeDatasetName}] Relationships after:`, JSON.stringify(activeDataset.relationships));
        return JSON.parse(JSON.stringify(newRelationship));
    } catch (error) {
        console.error(`[addRelationship Service - Active: ${activeDatasetName}] Error for ${sourceIdStr} -> ${targetIdStr}:`, error);
        if (error instanceof Error) {
            throw new Error(`Failed to add relationship: ${error.message}`);
        }
        throw new Error('An unknown error occurred while adding the relationship.');
    }
}

/**
 * Asynchronously fetches all relationships originating from a specific source ID in the *active* dataset.
 *
 * @param sourceEntryId The ID of the source entry.
 * @returns A promise resolving to an array of RelationshipEntry objects.
 * @throws {Error} If the operation fails or no dataset is active.
 */
export async function getRelationshipsBySourceId(sourceEntryId: number | string): Promise<RelationshipEntry[]> {
    const activeDataset = getActiveDataset();
    if (!activeDataset) {
        console.error(`[getRelationshipsBySourceId Service] No active dataset to fetch from.`);
        throw new Error('No active dataset selected.');
    }
    const sourceIdStr = String(sourceEntryId);
    console.log(`[getRelationshipsBySourceId Service - Active: ${activeDatasetName}] Called for source ID: ${sourceIdStr}`);
    try {
        await new Promise(resolve => setTimeout(resolve, 150)); // Simulate network delay
        const relationships = activeDataset.relationships.filter(
            rel => String(rel.source_entry_id) === sourceIdStr
        );
        console.log(`[getRelationshipsBySourceId Service - Active: ${activeDatasetName}] Found ${relationships.length} relationships for source ${sourceIdStr}.`);
        return JSON.parse(JSON.stringify(relationships));
    } catch (error) {
        console.error(`[getRelationshipsBySourceId Service - Active: ${activeDatasetName}] Error for source ID ${sourceIdStr}:`, error);
        if (error instanceof Error) {
            throw new Error(`Failed to fetch relationships for ID ${sourceIdStr}: ${error.message}`);
        }
        throw new Error(`An unknown error occurred while fetching relationships for ID ${sourceIdStr}.`);
    }
}

/**
 * Asynchronously fetches all relationships from the *active* simulated dataset.
 *
 * @returns A promise resolving to an array of all RelationshipEntry objects in the active dataset.
 * @throws {Error} If the operation fails or no dataset is active.
 */
export async function getAllRelationships(): Promise<RelationshipEntry[]> {
    const activeDataset = getActiveDataset();
    if (!activeDataset) {
        console.error(`[getAllRelationships Service] No active dataset to fetch from.`);
        throw new Error('No active dataset selected.');
    }
    console.log(`[getAllRelationships Service - Active: ${activeDatasetName}] Called`);
    try {
        await new Promise(resolve => setTimeout(resolve, 150)); // Simulate network delay
        console.log(`[getAllRelationships Service - Active: ${activeDatasetName}] Returning ${activeDataset.relationships.length} relationships.`);
        return JSON.parse(JSON.stringify(activeDataset.relationships));
    } catch (error) {
        console.error(`[getAllRelationships Service - Active: ${activeDatasetName}] Error:`, error);
        if (error instanceof Error) {
            throw new Error(`Failed to fetch all relationships: ${error.message}`);
        }
        throw new Error('An unknown error occurred while fetching all relationships.');
    }
}
