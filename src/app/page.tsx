
import 'dotenv/config';
import { DataUploadForm } from "@/components/data-upload-form";
import { pool } from "@/services/db/schemas/route";
import { DataPreviewSection } from "@/components/data-preview-section";
//import { getAllData, getAllRelationships, getAllPostgresItems } from "@/services/db/data-actions";
import type { DataEntry, RelationshipEntry } from "@/services/types"; // Import types
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const dynamic = 'force-dynamic'; // Ensure data is fetched on each request

export default async function Home() {
  let initialData: DataEntry[] = [];
  let activeDatasetName: string | null = 'demo';
  let allDatasetNames: string[] = [];
  let relationships: any[] = [];
  let error: string | null = null;
  let tables: any[] = [];
  let databases: any[] = [];
  
  try {
      const client = await pool().connect();
      client.release();
    
    
    const [allData, postgresItems] = await Promise.all([
      getAllData(activeDatasetName),
      getAllPostgresItems(),
    ]);
    [tables, databases, relationships] = postgresItems;

    
     if (allData.length === 0) {
        error = "No active dataset selected. Please create or select a dataset.";
        initialData = [];
        // Keep allDatasetNames as fetched, it might still be useful
    }

  } catch (e) {
    console.error("Failed to fetch initial data, relationships, or dataset names:", e);
    error = `Failed to load data for dataset '${activeDatasetName || 'N/A'}'. Please try again later.`;
    if (e instanceof Error) {        error = `${error} Details: ${e.message}`;
    }
    // Reset on error, but keep dataset names if fetched
    initialData = [];
     const { getAllData, getAllRelationships, getAllPostgresItems } = await import("@/services/db/data-actions");
   const [postgresItems] = await Promise.all([getAllPostgresItems()]);
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
       // initialData={initialData}
       // relationships={relationships}
        activeDatasetName={activeDatasetName}
        allDatasetNames={allDatasetNames}
        error={error}
      />
    </div>
  );
}
