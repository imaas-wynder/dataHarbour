/**
 * Represents a data entry to be stored in the database.
 * Structure can be flexible.
 */
export interface DataEntry {
  id?: number | string; // Optional ID, might be assigned by DB
  [key: string]: any; // Allows for dynamic keys and any value type
}

/**
 * Asynchronously adds a data entry via the API.
 *
 * @param data The data entry to add.
 * @returns A promise that resolves to true if the operation was successful, false otherwise.
 */
export async function addData(data: DataEntry): Promise<boolean> {
  console.log('addData service called with:', data);
  try {
    // In a real app, you would fetch your API endpoint here.
    // Example using fetch (adjust URL and method as needed):
    /*
    const response = await fetch('/api/data', { // Using the internal API route
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      console.error('Failed to add data via API:', response.status, await response.text());
      return false;
    }
    console.log('Data added successfully via API');
    return true;
    */

    // Placeholder: Simulate API call success/failure
    // Simulate potential failure for demonstration
    const success = Math.random() > 0.1; // 90% success rate
    if (!success) {
       console.warn('Simulated failure in addData for:', data);
    } else {
       console.log('Simulated success in addData for:', data);
    }
    await new Promise(resolve => setTimeout(resolve, 150)); // Simulate network delay
    return success;


  } catch (error) {
    console.error('Error in addData service:', error);
    return false;
  }
}

/**
 * Asynchronously fetches all data entries via an API.
 *
 * @returns A promise that resolves to an array of DataEntry objects.
 * @throws {Error} If the API call fails.
 */
export async function getAllData(): Promise<DataEntry[]> {
   console.log('getAllData service called');
  try {
     // In a real app, you would fetch your API endpoint here.
     // Example using fetch (adjust URL and method as needed):
    /*
    const response = await fetch('/api/data', { // Assuming a GET endpoint exists or is added
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

     if (!response.ok) {
       throw new Error(`Failed to fetch data: ${response.statusText}`);
     }

     const data = await response.json();
     console.log('Data fetched successfully via API:', data);
     return data;
    */

     // Placeholder: Simulate API call with sample data
     console.log('Returning simulated data from getAllData');
     await new Promise(resolve => setTimeout(resolve, 300)); // Simulate network delay
     return [
       { id: 1, name: 'Simulated Example Data', value: 123, timestamp: new Date().toISOString() },
       { id: 2, name: 'Another Simulated Entry', value: 456, category: 'Test', timestamp: new Date().toISOString() },
       { id: 3, complex: { nested: true, arr: [1, 2] }, description: 'Complex object example', timestamp: new Date().toISOString() },
     ];

   } catch (error) {
     console.error('Error in getAllData service:', error);
     // Re-throw the error to be handled by the calling component
     if (error instanceof Error) {
       throw new Error(`Failed to fetch data: ${error.message}`);
     }
     throw new Error('An unknown error occurred while fetching data.');
   }
}
