
import { notFound } from 'next/navigation';
import { getDataById } from '@/services/database';
import { DataDetailView } from '@/components/data-detail-view';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import type { DataEntry } from '@/services/types'; // Updated import path

interface DataDetailPageProps {
  params: {
    id: string;
  };
}

export const dynamic = 'force-dynamic'; // Ensure data is fetched on each request

export default async function DataDetailPage({ params }: DataDetailPageProps) {
  const { id } = params;
  // Fetch data using the active dataset implicitly handled by getDataById
  let dataEntry: DataEntry | null = null;
  let error: string | null = null;
  let activeDatasetName: string | null = null; // To display the dataset name

  try {
    // Fetch the active dataset name first for context
    activeDatasetName = await require('@/services/database').getActiveDatasetName();

    console.log(`[DataDetailPage - Active: ${activeDatasetName}] Rendering page for ID: ${id}`);
    dataEntry = await getDataById(id); // Fetches from the active dataset

    if (dataEntry) {
        console.log(`[DataDetailPage - Active: ${activeDatasetName}] Successfully fetched data for ID: ${id}.`);
    } else {
        console.warn(`[DataDetailPage - Active: ${activeDatasetName}] getDataById returned null for ID: ${id}. Entry not found in this dataset.`);
    }

  } catch (e) {
    console.error(`[DataDetailPage - Active: ${activeDatasetName}] Failed to fetch data for ID ${id}:`, e);
    error = `Failed to load data for ID ${id} from dataset '${activeDatasetName || 'N/A'}'.`;
    if (e instanceof Error) {
        error = `${error} Details: ${e.message}`;
    }
  }

  // Trigger 404 if no error occurred BUT dataEntry is still null
  if (!error && !dataEntry) {
     console.log(`[DataDetailPage - Active: ${activeDatasetName}] No data found for ID ${id}. Triggering notFound().`);
    notFound();
  }

  return (
    <div className="space-y-6">
       <Button variant="outline" asChild>
           <Link href="/">
             <ArrowLeft className="mr-2 h-4 w-4" /> Back to Overview
           </Link>
         </Button>
      <Card>
        <CardHeader>
          <CardTitle>Data Details (ID: {id})</CardTitle>
          <p className="text-sm text-muted-foreground">
            Dataset: <span className="font-medium">{activeDatasetName || 'N/A'}</span>
          </p>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-destructive">{error}</p>
          ) : dataEntry ? (
            <DataDetailView initialData={dataEntry} entryId={String(id)} />
          ) : (
             <p className="text-destructive">Data entry not found (ID: {id}) in dataset '{activeDatasetName || 'N/A'}'.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
