
// src/actions/data-actions.ts
'use server';

import {
    addData,
    updateDataById,
    getDataById,
    getDataByIds,
    addRelationship,
    getRelationshipsBySourceId,
    getAllData,
    getAllRelationships,
    setActiveDataset,        // Import new service function
    createOrReplaceDataset,  // Import new service function
    getActiveDatasetName,    // Import new service function
    getAllDatasetNames,      // Import new service function
    // Removed replaceDatabase import as it's superseded by createOrReplaceDataset
} from '@/services/database';
import type { DataEntry, RelationshipEntry } from '@/services/types'; // Import types
import { revalidatePath } from 'next/cache';
import { cleanDataFlow } from '@/ai/flows/clean-data-flow';

interface ActionResult {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
}

// --- Dataset Management Actions ---

/**
 * Sets the active dataset for subsequent operations.
 */
export async function setActiveDatasetAction(name: string): Promise<ActionResult> {
    console.log(`Server Action: Received request to set active dataset to: ${name}`);
    try {
        const success = await setActiveDataset(name);
        if (success) {
            console.log(`Server Action: Active dataset set to '${name}'.`);
            // Revalidate the main page to reflect changes related to the active dataset
            revalidatePath('/');
            return { success: true, message: `Dataset '${name}' is now active.` };
        } else {
            console.warn(`Server Action: Failed to set active dataset. Dataset '${name}' might not exist.`);
            return { success: false, error: `Dataset '${name}' not found.` };
        }
    } catch (error) {
        console.error(`Server Action: Error setting active dataset to '${name}':`, error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
        return { success: false, error: errorMessage };
    }
}

/**
 * Gets the name of the currently active dataset.
 */
export async function getActiveDatasetNameAction(): Promise<ActionResult> {
    console.log("Server Action: Received request to get active dataset name.");
    try {
        const name = await getActiveDatasetName();
        console.log(`Server Action: Active dataset name is '${name}'.`);
        return { success: true, data: name };
    } catch (error) {
        console.error("Server Action: Error getting active dataset name:", error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
        return { success: false, error: errorMessage };
    }
}

/**
 * Gets the names of all available datasets.
 */
export async function getAllDatasetNamesAction(): Promise<ActionResult> {
    console.log("Server Action: Received request to get all dataset names.");
    try {
        const names = await getAllDatasetNames();
        console.log(`Server Action: Found dataset names: [${names.join(', ')}]`);
        return { success: true, data: names };
    } catch (error) {
        console.error("Server Action: Error getting all dataset names:", error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
        return { success: false, error: errorMessage };
    }
}


/**
 * Creates a new dataset with the provided data, replacing if the name already exists.
 * Sets the new dataset as active.
 */
export async function createNewDatasetAction(datasetName: string, newData: DataEntry[]): Promise<ActionResult> {
  console.log(`Server Action: Received request to create/replace dataset '${datasetName}' with ${newData.length} entries.`);
  try {
    const success = await createOrReplaceDataset(datasetName, newData);

    if (success) {
      console.log(`Server Action: Dataset '${datasetName}' created/replaced and set as active.`);
      revalidatePath('/'); // Revalidate main page to show the new active dataset
      return { success: true, message: `New data set '${datasetName}' created successfully and is now active.` };
    } else {
      console.error(`Server Action: Failed to create/replace dataset '${datasetName}'.`);
      return { success: false, error: `Failed to create/replace dataset '${datasetName}'.` };
    }
  } catch (error) {
    console.error(`Server Action: Error creating/replacing dataset '${datasetName}':`, error);
    let errorMessage = `An unexpected error occurred while creating/replacing data set '${datasetName}'.`;
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return { success: false, error: errorMessage };
  }
}


// --- Data Operations Actions (operate on the active dataset) ---

export async function uploadDataAction(data: DataEntry | DataEntry[]): Promise<ActionResult> {
  const activeName = await getActiveDatasetName();
  console.log(`Server Action [Active: ${activeName}]: Received data for upload (Add New):`, data);
  try {
    let success = true;
    if (Array.isArray(data)) {
      const results = await Promise.all(data.map(entry => addData(entry))); // addData now uses active dataset
      success = results.every(result => result);
    } else {
      success = await addData(data); // addData now uses active dataset
    }

    if (success) {
      console.log(`Server Action [Active: ${activeName}]: Data added successfully.`);
      revalidatePath('/');
      return { success: true, message: 'Data added to the current set successfully.' };
    } else {
      console.error(`Server Action [Active: ${activeName}]: One or more entries failed to upload.`);
      return { success: false, error: 'Failed to add one or more data entries.' };
    }
  } catch (error) {
    console.error(`Server Action [Active: ${activeName}]: Error uploading data:`, error);
    let errorMessage = 'An unexpected error occurred during data upload.';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return { success: false, error: errorMessage };
  }
}

export async function cleanDataAction(entryId: number | string): Promise<ActionResult> {
  const activeName = await getActiveDatasetName();
  console.log(`Server Action [Active: ${activeName}]: Received request to clean data for ID: ${entryId}`);
  try {
    const currentData = await getDataById(entryId); // getDataById now uses active dataset
    if (!currentData) {
      return { success: false, error: `Data entry with ID ${entryId} not found in active dataset '${activeName}'.` };
    }

    const cleanedData = await cleanDataFlow(currentData);
    console.log(`Server Action [Active: ${activeName}]: Genkit flow returned cleaned data:`, cleanedData);
    return { success: true, message: 'Data cleaning suggestions generated.', data: cleanedData };

  } catch (error) {
    console.error(`Server Action [Active: ${activeName}]: Error cleaning data for ID ${entryId}:`, error);
    let errorMessage = 'An unexpected error occurred during data cleaning.';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return { success: false, error: errorMessage };
  }
}

export async function updateDataAction(entryId: number | string, cleanedData: DataEntry): Promise<ActionResult> {
    const activeName = await getActiveDatasetName();
    console.log(`Server Action [Active: ${activeName}]: Received request to update/amend data for ID: ${entryId}`);
    try {
        const { id, ...dataToUpdate } = cleanedData;
        const success = await updateDataById(entryId, dataToUpdate); // updateDataById now uses active dataset

        if (success) {
            console.log(`Server Action [Active: ${activeName}]: Data for ID ${entryId} updated successfully.`);
            revalidatePath(`/data/${entryId}`);
            revalidatePath('/');
            return { success: true, message: 'Data entry amended successfully.' };
        } else {
            console.error(`Server Action [Active: ${activeName}]: Failed to update data for ID ${entryId}.`);
            return { success: false, error: `Failed to amend data entry with ID ${entryId} in active dataset '${activeName}'. Ensure the ID exists.` };
        }
    } catch (error) {
        console.error(`Server Action [Active: ${activeName}]: Error updating data for ID ${entryId}:`, error);
        let errorMessage = 'An unexpected error occurred during data update.';
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return { success: false, error: errorMessage };
    }
}

/**
 * Fetches multiple data entries by their IDs from the active dataset.
 */
export async function getDataByIdsAction(ids: (number | string)[]): Promise<ActionResult> {
    const activeName = await getActiveDatasetName();
    console.log(`Server Action [Active: ${activeName}]: Received request to get data for IDs: [${ids.join(', ')}]`);
    try {
        const data = await getDataByIds(ids); // getDataByIds now uses active dataset
        console.log(`Server Action [Active: ${activeName}]: Found ${data.length} entries for the requested IDs.`);
        return { success: true, data: data };
    } catch (error) {
        console.error(`Server Action [Active: ${activeName}]: Error getting data for IDs [${ids.join(', ')}]:`, error);
        let errorMessage = 'An unexpected error occurred while fetching multiple data entries.';
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return { success: false, error: errorMessage };
    }
}

/**
 * Fetches all data entries from the active dataset.
 */
export async function getAllDataAction(): Promise<ActionResult> {
    const activeName = await getActiveDatasetName();
    console.log(`Server Action [Active: ${activeName}]: Received request to get all data.`);
     try {
         const data = await getAllData(); // getAllData now uses active dataset
         console.log(`Server Action [Active: ${activeName}]: Found ${data.length} total data entries.`);
         return { success: true, data: data };
     } catch (error) {
         console.error(`Server Action [Active: ${activeName}]: Error getting all data:`, error);
         let errorMessage = 'An unexpected error occurred while fetching all data.';
         if (error instanceof Error) {
             errorMessage = error.message;
         }
         return { success: false, error: errorMessage };
     }
}


// --- Relationship Actions (operate on the active dataset) ---

export async function addRelationshipAction(sourceId: number | string, targetId: number | string): Promise<ActionResult> {
    const activeName = await getActiveDatasetName();
    const sourceIdStr = String(sourceId);
    const targetIdStr = String(targetId);
    console.log(`Server Action [Active: ${activeName}]: Received request to add relationship: ${sourceIdStr} -> ${targetIdStr}`);
    try {
        if (sourceIdStr === targetIdStr) {
             console.warn(`Server Action [Active: ${activeName}]: Attempted to add self-referencing relationship for ID ${sourceIdStr}.`);
             return { success: false, error: 'Cannot create a relationship with the same entry.' };
        }

        const newRelationship = await addRelationship(sourceIdStr, targetIdStr); // addRelationship now uses active dataset

        if (newRelationship) {
            console.log(`Server Action [Active: ${activeName}]: Relationship added successfully:`, newRelationship);
            revalidatePath(`/data/${sourceIdStr}`);
            revalidatePath('/');
            return { success: true, message: 'Relationship added successfully.', data: newRelationship };
        } else {
             console.warn(`Server Action [Active: ${activeName}]: addRelationship service returned null for ${sourceIdStr} -> ${targetIdStr}. Checking entry existence...`);
             // Check existence within the *active* dataset
             const sourceExists = !!await getDataById(sourceIdStr);
             const targetExists = !!await getDataById(targetIdStr);
             let errorMsg = `Failed to add relationship in dataset '${activeName}'. Possible duplicate or other issue.`;
             if (!sourceExists) errorMsg = `Source entry ID ${sourceIdStr} not found in dataset '${activeName}'.`;
             else if (!targetExists) errorMsg = `Target entry ID ${targetIdStr} not found in dataset '${activeName}'.`;

             console.error(`Server Action [Active: ${activeName}]: Failed add relationship ${sourceIdStr} -> ${targetIdStr}. ${errorMsg}`);
             return { success: false, error: errorMsg };
        }
    } catch (error) {
        console.error(`Server Action [Active: ${activeName}]: Error adding relationship ${sourceIdStr} -> ${targetIdStr}:`, error);
        let errorMessage = 'An unexpected error occurred while adding the relationship.';
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return { success: false, error: errorMessage };
    }
}

/**
 * Fetches relationships originating from a specific source ID in the active dataset.
 */
export async function getRelationshipsAction(sourceId: number | string): Promise<ActionResult> {
    const activeName = await getActiveDatasetName();
    console.log(`Server Action [Active: ${activeName}]: Received request to get relationships for source ID: ${sourceId}`);
    try {
        const relationships = await getRelationshipsBySourceId(sourceId); // getRelationshipsBySourceId now uses active dataset
        console.log(`Server Action [Active: ${activeName}]: Found ${relationships.length} relationships for ${sourceId}.`);
        return { success: true, data: relationships };
    } catch (error) {
        console.error(`Server Action [Active: ${activeName}]: Error getting relationships for ID ${sourceId}:`, error);
        let errorMessage = 'An unexpected error occurred while fetching relationships.';
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return { success: false, error: errorMessage };
    }
}

/**
 * Fetches all relationships from the active dataset.
 */
export async function getAllRelationshipsAction(): Promise<ActionResult> {
    const activeName = await getActiveDatasetName();
    console.log(`Server Action [Active: ${activeName}]: Received request to get all relationships.`);
    try {
        const relationships = await getAllRelationships(); // getAllRelationships now uses active dataset
        console.log(`Server Action [Active: ${activeName}]: Found ${relationships.length} total relationships.`);
        return { success: true, data: relationships };
    } catch (error) {
        console.error(`Server Action [Active: ${activeName}]: Error getting all relationships:`, error);
        let errorMessage = 'An unexpected error occurred while fetching all relationships.';
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return { success: false, error: errorMessage };
    }
}
