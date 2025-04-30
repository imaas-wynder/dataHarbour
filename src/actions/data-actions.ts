// src/actions/data-actions.ts
'use server';

import { addData, updateDataById, type DataEntry, getDataById } from '@/services/database';
import { revalidatePath } from 'next/cache';
import { cleanDataFlow } from '@/ai/flows/clean-data-flow'; // Import the Genkit flow

interface ActionResult {
  success: boolean;
  message?: string;
  error?: string;
  data?: any; // To return cleaned data or other relevant info
}

export async function uploadDataAction(data: DataEntry | DataEntry[]): Promise<ActionResult> {
  console.log("Server Action: Received data for upload:", data);
  try {
    let success = true;
    if (Array.isArray(data)) {
      // Handle array of entries
      const results = await Promise.all(data.map(entry => addData(entry)));
      success = results.every(result => result);
    } else {
      // Handle single entry
      success = await addData(data);
    }

    if (success) {
      console.log("Server Action: Data added successfully.");
      revalidatePath('/'); // Revalidate the home page to refresh the data preview
      return { success: true, message: 'Data uploaded successfully.' };
    } else {
      console.error("Server Action: One or more entries failed to upload.");
      return { success: false, error: 'Failed to upload one or more data entries.' };
    }
  } catch (error) {
    console.error('Server Action: Error uploading data:', error);
    let errorMessage = 'An unexpected error occurred during data upload.';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return { success: false, error: errorMessage };
  }
}

export async function cleanDataAction(entryId: number | string): Promise<ActionResult> {
  console.log(`Server Action: Received request to clean data for ID: ${entryId}`);
  try {
    const currentData = await getDataById(entryId);
    if (!currentData) {
      return { success: false, error: `Data entry with ID ${entryId} not found.` };
    }

    // Call the Genkit flow
    const cleanedData = await cleanDataFlow(currentData);

    console.log("Server Action: Genkit flow returned cleaned data:", cleanedData);

    return { success: true, message: 'Data cleaning suggestions generated.', data: cleanedData };

  } catch (error) {
    console.error(`Server Action: Error cleaning data for ID ${entryId}:`, error);
    let errorMessage = 'An unexpected error occurred during data cleaning.';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return { success: false, error: errorMessage };
  }
}

export async function updateDataAction(entryId: number | string, cleanedData: DataEntry): Promise<ActionResult> {
    console.log(`Server Action: Received request to update data for ID: ${entryId}`);
    try {
        // Remove id from cleanedData if present, as we use entryId to update
        const { id, ...dataToUpdate } = cleanedData;

        const success = await updateDataById(entryId, dataToUpdate);

        if (success) {
            console.log(`Server Action: Data for ID ${entryId} updated successfully.`);
            // Revalidate the specific data page and the main list
            revalidatePath(`/data/${entryId}`);
            revalidatePath('/');
            return { success: true, message: 'Data updated successfully.' };
        } else {
            console.error(`Server Action: Failed to update data for ID ${entryId}.`);
            return { success: false, error: `Failed to update data entry with ID ${entryId}.` };
        }
    } catch (error) {
        console.error(`Server Action: Error updating data for ID ${entryId}:`, error);
        let errorMessage = 'An unexpected error occurred during data update.';
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return { success: false, error: errorMessage };
    }
}
