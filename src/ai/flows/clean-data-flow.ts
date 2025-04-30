// src/ai/flows/clean-data-flow.ts
'use server';
/**
 * @fileOverview A Genkit flow for cleaning and standardizing data entries.
 *
 * - cleanDataFlow - A function that takes a data entry and returns a cleaned version.
 * - CleanDataInput - The input type for the cleanDataFlow function (currently DataEntry).
 * - CleanDataOutput - The return type for the cleanDataFlow function (currently DataEntry).
 */

import { ai } from '@/ai/ai-instance';
import type { DataEntry } from '@/services/database'; // Assuming DataEntry can be represented by Zod any
import { z } from 'genkit';

// Define a flexible schema for input and output, as DataEntry is dynamic
// Using z.record(z.string(), z.any()) allows any key-value pairs
const DataEntrySchema = z.record(z.string(), z.any()).describe('A flexible data entry object with string keys and any value types.');
export type CleanDataInput = z.infer<typeof DataEntrySchema>;
export type CleanDataOutput = z.infer<typeof DataEntrySchema>;


// Define the prompt for the LLM
const cleanDataPrompt = ai.definePrompt({
  name: 'cleanDataPrompt',
  input: {
    schema: DataEntrySchema,
  },
  output: {
    schema: DataEntrySchema,
  },
  prompt: `You are an expert data cleaning agent. Analyze the following JSON data entry and perform these cleaning tasks:
1.  Trim leading/trailing whitespace from all string values.
2.  Standardize casing for common keys if possible (e.g., 'email' to lowercase). Infer reasonable standardization based on the key name.
3.  Correct obvious typos in string values where confidence is high.
4.  Attempt to standardize boolean-like strings (e.g., "yes", "True", "1" to true; "no", "False", "0" to false).
5.  Format date strings to ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ) if they are recognizable date formats.
6.  Ensure the structure of the JSON remains the same, only modifying values and potentially key casing. Do not add or remove keys unless it's purely a casing change.
7.  Return the cleaned JSON object.

Original Data Entry:
\`\`\`json
{{{json input}}}
\`\`\`

Return ONLY the cleaned JSON object.`,
});


// Define the Genkit flow
export const cleanDataFlow = ai.defineFlow<
  typeof DataEntrySchema, // Input type
  typeof DataEntrySchema  // Output type
>(
  {
    name: 'cleanDataFlow',
    inputSchema: DataEntrySchema,
    outputSchema: DataEntrySchema,
  },
  async (dataEntry) => {
    console.log("Genkit Flow: Received data for cleaning:", dataEntry);

    // Call the LLM prompt with the data entry
    const result = await cleanDataPrompt(dataEntry);
    const cleanedOutput = result.output();

    if (!cleanedOutput) {
        console.error("Genkit Flow: LLM did not return valid output.");
        throw new Error('Failed to get cleaned data from the AI model.');
    }

    console.log("Genkit Flow: Returning cleaned data:", cleanedOutput);
    // The output schema should already handle parsing the JSON string from the LLM
    return cleanedOutput;
  }
);

// Optional: Export a wrapper function if needed elsewhere, though actions can call the flow directly
// export async function cleanDataEntry(input: CleanDataInput): Promise<CleanDataOutput> {
//   return cleanDataFlow(input);
// }
