// src/actions/data-actions.ts
'use server';

import {
    addData,
    updateDataById,
    getDataById,
    addRelationship,
    getRelationshipsBySourceId,
    replaceDatabase, // Import the new service function
    type DataEntry,
    type RelationshipEntry,
} from '@/services/database';
import { revalidatePath } from 'next/cache';
import { cleanDataFlow } from '@/ai/flows/clean-data-flow'; // Import the Genkit flow

interface ActionResult {
  success: boolean;
  message?: string;
  error?: string;
  data?: any; // To return cleaned data, relationships, or other relevant info
}

export async function uploadDataAction(data: DataEntry | DataEntry[]): Promise<ActionResult> {
  console.log("Server Action: Received data for upload (Add New):", data);
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
      return { success: true, message: 'Data added to the current set successfully.' };
    } else {
      console.error("Server Action: One or more entries failed to upload.");
      return { success: false, error: 'Failed to add one or more data entries.' };
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
    console.log(`Server Action: Received request to update/amend data for ID: ${entryId}`);
    try {
        // Remove id from cleanedData if present, as we use entryId to update
        const { id, ...dataToUpdate } = cleanedData;

        const success = await updateDataById(entryId, dataToUpdate);

        if (success) {
            console.log(`Server Action: Data for ID ${entryId} updated successfully.`);
            // Revalidate the specific data page and the main list
            revalidatePath(`/data/${entryId}`);
            revalidatePath('/');
            return { success: true, message: 'Data entry amended successfully.' };
        } else {
            console.error(`Server Action: Failed to update data for ID ${entryId}.`);
            return { success: false, error: `Failed to amend data entry with ID ${entryId}. Ensure the ID exists.` };
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

/**
 * Replaces the entire in-memory database with the provided data.
 * Also clears all relationships.
 */
export async function replaceDataAction(newData: DataEntry[]): Promise<ActionResult> {
  console.log("Server Action: Received request to replace entire dataset with:", newData);
  try {
    const success = await replaceDatabase(newData);

    if (success) {
      console.log("Server Action: Dataset replaced successfully.");
      // Revalidate all relevant paths. '/' is the most important.
      revalidatePath('/');
      // You might need to revalidate individual data paths if users could be viewing them,
      // but they would likely 404 if the ID is no longer present. Revalidating '/'
      // ensures the main preview is up-to-date.
      return { success: true, message: 'New data set created successfully. Existing data replaced.' };
    } else {
      console.error("Server Action: Failed to replace the dataset.");
      return { success: false, error: 'Failed to replace the dataset.' };
    }
  } catch (error) {
    console.error('Server Action: Error replacing dataset:', error);
    let errorMessage = 'An unexpected error occurred while creating the new data set.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return { success: false, error: errorMessage };
  }
}


// --- Relationship Actions ---

export async function addRelationshipAction(sourceId: number | string, targetId: number | string): Promise<ActionResult> {
    console.log(`Server Action: Received request to add relationship: ${sourceId} -> ${targetId}`);
    try {
        // Validate IDs are not the same before calling service
        if (String(sourceId) === String(targetId)) {
             return { success: false, error: 'Cannot create a relationship with the same entry.' };
        }

        const newRelationship = await addRelationship(sourceId, targetId);

        if (newRelationship) {
            console.log("Server Action: Relationship added successfully.");
            // Revalidate the data detail page for the source ID to show the new relationship
            revalidatePath(`/data/${sourceId}`);
            return { success: true, message: 'Relationship added successfully.', data: newRelationship };
        } else {
             // Check if entries exist to provide a more specific error
             const sourceExists = !!await getDataById(sourceId);
             const targetExists = !!await getDataById(targetId);
             let errorMsg = 'Failed to add relationship.';
             if (!sourceExists) errorMsg = `Source entry with ID ${sourceId} not found.`;
             else if (!targetExists) errorMsg = `Target entry with ID ${targetId} not found.`;
             // Could also check for duplicates if addRelationship returns null for that reason

             console.error(`Server Action: Failed to add relationship ${sourceId} -> ${targetId}. ${errorMsg}`);
             return { success: false, error: errorMsg };
        }
    } catch (error) {
        console.error(`Server Action: Error adding relationship ${sourceId} -> ${targetId}:`, error);
        let errorMessage = 'An unexpected error occurred while adding the relationship.';
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return { success: false, error: errorMessage };
    }
}

export async function getRelationshipsAction(sourceId: number | string): Promise<ActionResult> {
    console.log(`Server Action: Received request to get relationships for source ID: ${sourceId}`);
    try {
        const relationships = await getRelationshipsBySourceId(sourceId);
        console.log(`Server Action: Found ${relationships.length} relationships for ${sourceId}.`);
        return { success: true, data: relationships };
    } catch (error) {
        console.error(`Server Action: Error getting relationships for ID ${sourceId}:`, error);
        let errorMessage = 'An unexpected error occurred while fetching relationships.';
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return { success: false, error: errorMessage };
    }
}
