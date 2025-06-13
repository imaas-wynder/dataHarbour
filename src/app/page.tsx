
import 'dotenv/config';
import { DataUploadForm } from "@/components/data-upload-form";
import { DataPreviewSection } from "@/components/data-preview-section";
import type { DataEntry, RelationshipEntry } from "@/services/types"; // Static import for types
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
// Corrected and centralized imports for server actions
import {
  getAllData,
  getAllRelationships,
  getAllDatasetNames,
  getActiveDatasetName
  // getAllPostgresItems, // Only if truly needed for tables/databases display
} from "@/services/db/data-actions";

export const dynamic = 'force-dynamic'; // Ensure data is fetched on each request

export default async function Home() {
  let initialData: DataEntry[] = [];
  let initialRelationshipsList: RelationshipEntry[] = [];
  let currentActiveDataset: string | null = null;
  let availableDatasetNames: string[] = [];
  let pageScopedError: string | null = null;
  // let tablesMeta: any[] = []; // For getAllPostgresItems if used
  // let databasesMeta: any[] = []; // For getAllPostgresItems if used

  try {
    // Fetch dataset names and current active dataset first
    currentActiveDataset = await getActiveDatasetName();
    availableDatasetNames = await getAllDatasetNames();

    if (currentActiveDataset) {
      // If an active dataset is set, fetch its data and relationships
      // Note: getAllData and getAllRelationships now correctly use the fetched active dataset name
      const [data, relationships] = await Promise.all([
        getAllData(currentActiveDataset),
        getAllRelationships(currentActiveDataset),
        // getAllPostgresItems(), // Uncomment if tables/databases metadata is actually used
      ]);
      initialData = data; // getAllData directly returns DataEntry[]
      initialRelationshipsList = relationships; // getAllRelationships directly returns RelationshipEntry[]

      // Example if getAllPostgresItems was used:
      // const pgItems = result[2]; // Assuming it's the third item from Promise.all
      // if (pgItems && pgItems.length === 3) { // Ensure pgItems is as expected
      //   tablesMeta = pgItems[0];
      //   databasesMeta = pgItems[1];
      //   // The third item from getAllPostgresItems is information_schema data, not app relationships
      // }

      if (initialData.length === 0) {
        // This is not an error, but a state where the active dataset is empty.
        // The DataPreviewSection can show a "No data in this dataset" message.
      }
    } else if (availableDatasetNames.length > 0) {
      // No active dataset, but other datasets exist
      pageScopedError = "No active dataset. Please select a dataset from the dropdown or upload data to a new one.";
    } else {
      // No datasets exist at all
      pageScopedError = "No datasets available. Upload data to create your first dataset.";
    }
  } catch (e) {
    console.error("Failed to fetch initial data for Home page:", e);
    pageScopedError = `Failed to load page data. Please ensure the database is running and configured correctly.`;
    if (e instanceof Error) {
      pageScopedError = `${pageScopedError} Details: ${e.message}`;
    }
    // Reset data states on error
    initialData = [];
    initialRelationshipsList = [];
    // currentActiveDataset and availableDatasetNames might hold values if fetched before error
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Upload New Data</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Pass dataset names to the form for context if needed by DataUploadConfirmationDialog */}
          <DataUploadForm allDatasetNames={availableDatasetNames} />
        </CardContent>
      </Card>

      <Separator />

      <DataPreviewSection
        initialData={initialData}
        initialRelationships={initialRelationshipsList} // Pass the application-specific relationships
        activeDatasetName={currentActiveDataset}
        allDatasetNames={availableDatasetNames}
        error={pageScopedError}
      />
    </div>
  );
}
