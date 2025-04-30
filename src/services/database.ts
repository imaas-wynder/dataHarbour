/**
 * Represents a data entry to be stored in the database.
 * Structure can be flexible.
 */
export interface DataEntry {
  id?: number | string; // Optional ID, might be assigned by DB
  [key: string]: any; // Allows for dynamic keys and any value type
}

// Simulated database store
let simulatedDatabase: DataEntry[] = [
   { id: 1, name: 'Simulated Example Data', value: 123, timestamp: new Date().toISOString(), details: 'Some initial details' },
   { id: 2, name: 'Another Simulated Entry', value: 456, category: 'Test', timestamp: new Date().toISOString(), email: ' test@example.com ', inconsistent_value: ' yes '},
   { id: 3, complex: { nested: true, arr: [1, 2] }, description: 'Complex object example', timestamp: new Date().toISOString(), status: 'pending' },
 ];
let nextId = 4;

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
