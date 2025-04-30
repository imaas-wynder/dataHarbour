'use server';

import { addData } from '@/services/database';
import type { DataEntry } from '@/services/database';
import { revalidatePath } from 'next/cache';

interface ActionResult {
  success: boolean;
  error?: string;
}

export async function uploadDataAction(data: DataEntry | DataEntry[]): Promise<ActionResult> {
  console.log("Server Action: Received data for upload:", data);
  try {
    let success = true;
    if (Array.isArray(data)) {
      // Handle array of entries
      for (const entry of data) {
        const result = await addData(entry);
        if (!result) {
          success = false;
          // Optionally break or collect errors
          console.error("Server Action: Failed to add entry:", entry);
        }
      }
    } else {
      // Handle single entry
      success = await addData(data);
       if (!success) {
         console.error("Server Action: Failed to add single entry:", data);
       }
    }

    if (success) {
      console.log("Server Action: Data added successfully.");
      revalidatePath('/'); // Revalidate the home page to refresh the data preview
      return { success: true };
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
