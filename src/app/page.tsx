import { DataUploadForm } from "@/components/data-upload-form";
import { DataPreviewSection } from "@/components/data-preview-section"; // Import the new client component
import { getAllData } from "@/services/database";
import type { DataEntry } from "@/services/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const dynamic = 'force-dynamic'; // Ensure data is fetched on each request

export default async function Home() {
  let initialData: DataEntry[] = [];
  let error: string | null = null;

  try {
    initialData = await getAllData();
  } catch (e) {
    console.error("Failed to fetch data:", e);
    error = "Failed to load data. Please try again later.";
    // Assign empty array even on error so the preview section can render
    initialData = [];
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

      {/* Use the new client component for the preview section */}
      <DataPreviewSection initialData={initialData} error={error} />
    </div>
  );
}
