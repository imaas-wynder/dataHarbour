
import { DataUploadForm } from "@/components/data-upload-form";
import { DataPreviewSection } from "@/components/data-preview-section";
import { getAllData, getAllRelationships, getActiveDatasetName, getAllDatasetNames } from "@/services/database"; // Import dataset name functions
import type { DataEntry, RelationshipEntry } from "@/services/types"; // Import types
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const dynamic = 'force-dynamic'; // Ensure data is fetched on each request

export default async function Home() {
  let initialData: DataEntry[] = [];
  let initialRelationships: RelationshipEntry[] = [];
  let activeDatasetName: string | null = null;
  let allDatasetNames: string[] = [];
  let error: string | null = null;

  try {
    // Fetch active dataset name and all names first
    activeDatasetName = await getActiveDatasetName();
    allDatasetNames = await getAllDatasetNames();

    // Fetch data and relationships for the active dataset
    if (activeDatasetName) {
        [initialData, initialRelationships] = await Promise.all([
            getAllData(),      // Fetches from active dataset
            getAllRelationships(), // Fetches from active dataset
        ]);
    } else {
        // Handle case where no dataset is active (e.g., initial state or error)
        error = "No active dataset selected. Please create or select a dataset.";
        initialData = [];
        initialRelationships = [];
        // Keep allDatasetNames as fetched, it might still be useful
    }

  } catch (e) {
    console.error("Failed to fetch initial data, relationships, or dataset names:", e);
    error = `Failed to load data for dataset '${activeDatasetName || 'N/A'}'. Please try again later.`;
    if (e instanceof Error) {
        error = `${error} Details: ${e.message}`;
    }
    // Reset on error, but keep dataset names if fetched
    initialData = [];
    initialRelationships = [];
    activeDatasetName = await getActiveDatasetName(); // Re-fetch active name in case it changed during error
    allDatasetNames = await getAllDatasetNames(); // Re-fetch all names
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Upload New Data</CardTitle>
        </CardHeader>
        <CardContent>
          <DataUploadForm allDatasetNames={allDatasetNames}/> {/* Pass dataset names */}
        </CardContent>
      </Card>

      <Separator />

      {/* Pass dataset names and active name to the preview section */}
      <DataPreviewSection
        initialData={initialData}
        initialRelationships={initialRelationships}
        activeDatasetName={activeDatasetName}
        allDatasetNames={allDatasetNames}
        error={error}
      />
    </div>
  );
}
