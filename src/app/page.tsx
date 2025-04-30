import { DataUploadForm } from "@/components/data-upload-form";
import { DataPreviewSection } from "@/components/data-preview-section"; // Import the new client component
import { getAllData, getAllRelationships } from "@/services/database"; // Import getAllRelationships
import type { DataEntry, RelationshipEntry } from "@/services/database"; // Import RelationshipEntry
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const dynamic = 'force-dynamic'; // Ensure data is fetched on each request

export default async function Home() {
  let initialData: DataEntry[] = [];
  let initialRelationships: RelationshipEntry[] = [];
  let error: string | null = null;

  try {
    // Fetch both data and relationships
    [initialData, initialRelationships] = await Promise.all([
      getAllData(),
      getAllRelationships(),
    ]);
  } catch (e) {
    console.error("Failed to fetch initial data or relationships:", e);
    error = "Failed to load initial data or relationships. Please try again later.";
    // Assign empty arrays even on error so the preview section can render
    initialData = [];
    initialRelationships = [];
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Upload New Data</CardTitle>
        </CardHeader>
        <CardContent>
          <DataUploadForm />
        </CardContent>
      </Card>

      <Separator />

      {/* Pass both initial data and relationships to the preview section */}
      <DataPreviewSection
        initialData={initialData}
        initialRelationships={initialRelationships}
        error={error}
      />
    </div>
  );
}
