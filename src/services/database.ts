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


// Simulated database store
let simulatedDatabase: DataEntry[] = [
   { id: 1, name: 'Simulated Example Data', value: 123, timestamp: new Date().toISOString(), details: 'Some initial details' },
   { id: 2, name: 'Another Simulated Entry', value: 456, category: 'Test', timestamp: new Date().toISOString(), email: ' test@example.com ', inconsistent_value: ' yes '},
   { id: 3, complex: { nested: true, arr: [1, 2] }, description: 'Complex object example', timestamp: new Date().toISOString(), status: 'pending' },
 ];
let nextId = 4;
let simulatedRelationships: RelationshipEntry[] = []; // Added simulated store for relationships
let nextRelationshipId = 1;

/**
 * Asynchronously adds a data entry to the simulated database.
 *
 * @param data The data entry to add.
 * @returns A promise that resolves to true if the operation was successful, false otherwise.
 */
export async function addData(data: DataEntry): Promise<boolean> {
  console.log('addData service called with:', data);
  try {
    // Simulate potential failure for demonstration
    const success = Math.random() > 0.1; // 90% success rate
    await new Promise(resolve => setTimeout(resolve, 150)); // Simulate network delay

    if (success) {
       console.log('Simulated success in addData for:', data);
       if (Array.isArray(data)) {
        data.forEach(entry => {
          const newEntry = { ...entry, id: entry.id ?? nextId++ };
          simulatedDatabase.push(newEntry);
        });
       } else {
         const newEntry = { ...data, id: data.id ?? nextId++ };
         simulatedDatabase.push(newEntry);
       }
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
 *
 * @returns A promise that resolves to an array of DataEntry objects.
 * @throws {Error} If the operation fails.
 */
export async function getAllData(): Promise<DataEntry[]> {
   console.log('getAllData service called');
  try {
     console.log('Returning simulated data from getAllData');
     await new Promise(resolve => setTimeout(resolve, 300)); // Simulate network delay
     // Return a deep copy to prevent direct mutation
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
 *
 * @param id The ID of the data entry to fetch.
 * @returns A promise that resolves to the DataEntry object or null if not found.
 * @throws {Error} If the operation fails.
 */
export async function getDataById(id: number | string): Promise<DataEntry | null> {
  console.log(`getDataById service called for ID: ${id}`);
  try {
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate network delay
    // Ensure comparison works for both number and string IDs if necessary
    const entry = simulatedDatabase.find(entry => String(entry.id) === String(id));
    if (entry) {
        console.log('Found entry:', entry);
        // Return a deep copy
        return JSON.parse(JSON.stringify(entry));
    } else {
        console.log('Entry not found');
        return null;
    }
  } catch (error) {
    console.error(`Error in getDataById service for ID ${id}:`, error);
    if (error instanceof Error) {
      throw new Error(`Failed to fetch data for ID ${id}: ${error.message}`);
    }
    throw new Error(`An unknown error occurred while fetching data for ID ${id}.`);
  }
}

/**
 * Asynchronously updates a data entry by its ID in the simulated database.
 *
 * @param id The ID of the data entry to update.
 * @param updatedData The partial or full data to update the entry with.
 * @returns A promise that resolves to true if the update was successful, false otherwise.
 * @throws {Error} If the operation fails.
 */
export async function updateDataById(id: number | string, updatedData: Partial<DataEntry>): Promise<boolean> {
    console.log(`updateDataById service called for ID: ${id} with data:`, updatedData);
    try {
        await new Promise(resolve => setTimeout(resolve, 200)); // Simulate network delay
        const index = simulatedDatabase.findIndex(entry => String(entry.id) === String(id));

        if (index !== -1) {
            // Merge existing data with updated data, ensuring ID remains unchanged
            const currentEntry = simulatedDatabase[index];
            simulatedDatabase[index] = { ...currentEntry, ...updatedData, id: currentEntry.id };
            console.log('Updated entry:', simulatedDatabase[index]);
            return true;
        } else {
            console.log('Entry not found for update');
            return false;
        }
    } catch (error) {
        console.error(`Error in updateDataById service for ID ${id}:`, error);
        if (error instanceof Error) {
            throw new Error(`Failed to update data for ID ${id}: ${error.message}`);
        }
        throw new Error(`An unknown error occurred while updating data for ID ${id}.`);
    }
}

/**
 * Asynchronously adds a relationship between two data entries.
 *
 * @param sourceEntryId The ID of the source entry.
 * @param targetEntryId The ID of the target entry to relate.
 * @returns A promise that resolves to the newly created RelationshipEntry or null if failed.
 * @throws {Error} If the operation fails.
 */
export async function addRelationship(sourceEntryId: number | string, targetEntryId: number | string): Promise<RelationshipEntry | null> {
    console.log(`addRelationship service called: Source ${sourceEntryId}, Target ${targetEntryId}`);
    try {
        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate network delay

        // Basic validation: check if source and target entries exist (optional, but good practice)
        const sourceExists = simulatedDatabase.some(entry => String(entry.id) === String(sourceEntryId));
        const targetExists = simulatedDatabase.some(entry => String(entry.id) === String(targetEntryId));

        if (!sourceExists || !targetExists) {
            console.warn(`Cannot add relationship: Source (${sourceEntryId}) or Target (${targetEntryId}) entry does not exist.`);
            return null; // Indicate failure due to non-existent entries
        }

        // Prevent duplicate relationships (source -> target)
        const existingRelationship = simulatedRelationships.find(
            rel => String(rel.source_entry_id) === String(sourceEntryId) &&
                   String(rel.target_entry_id) === String(targetEntryId)
        );

        if (existingRelationship) {
            console.warn(`Relationship from ${sourceEntryId} to ${targetEntryId} already exists.`);
            return existingRelationship; // Return existing one or null, depending on desired behavior
        }

        // Prevent self-referencing relationships
         if (String(sourceEntryId) === String(targetEntryId)) {
            console.warn(`Cannot add self-referencing relationship for ID ${sourceEntryId}.`);
            return null;
         }


        const newRelationship: RelationshipEntry = {
            id: nextRelationshipId++,
            source_entry_id: sourceEntryId,
            target_entry_id: targetEntryId,
            created_at: new Date().toISOString(),
        };
        simulatedRelationships.push(newRelationship);
        console.log('Added new relationship:', newRelationship);
        return JSON.parse(JSON.stringify(newRelationship)); // Return a copy
    } catch (error) {
        console.error(`Error in addRelationship service for ${sourceEntryId} -> ${targetEntryId}:`, error);
        if (error instanceof Error) {
            throw new Error(`Failed to add relationship: ${error.message}`);
        }
        throw new Error('An unknown error occurred while adding the relationship.');
    }
}

/**
 * Asynchronously fetches all relationships originating from a specific source entry ID.
 *
 * @param sourceEntryId The ID of the source entry.
 * @returns A promise that resolves to an array of RelationshipEntry objects.
 * @throws {Error} If the operation fails.
 */
export async function getRelationshipsBySourceId(sourceEntryId: number | string): Promise<RelationshipEntry[]> {
    console.log(`getRelationshipsBySourceId service called for source ID: ${sourceEntryId}`);
    try {
        await new Promise(resolve => setTimeout(resolve, 150)); // Simulate network delay
        const relationships = simulatedRelationships.filter(
            rel => String(rel.source_entry_id) === String(sourceEntryId)
        );
        console.log(`Found ${relationships.length} relationships for source ID ${sourceEntryId}`);
        return JSON.parse(JSON.stringify(relationships)); // Return a deep copy
    } catch (error) {
        console.error(`Error in getRelationshipsBySourceId service for source ID ${sourceEntryId}:`, error);
        if (error instanceof Error) {
            throw new Error(`Failed to fetch relationships for ID ${sourceEntryId}: ${error.message}`);
        }
        throw new Error(`An unknown error occurred while fetching relationships for ID ${sourceEntryId}.`);
    }
}

// NOTE: In a real application, you would add functions to initialize the
// relationships table (e.g., CREATE TABLE IF NOT EXISTS data_relationships...).
// For this simulation, we just use the in-memory array `simulatedRelationships`.
