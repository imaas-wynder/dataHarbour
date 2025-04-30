{// src/app/data/[id]/page.tsx
import { notFound } from 'next/navigation';
import { getDataById } from '@/services/database'; // Removed getRelationshipsBySourceId import as relationships are handled client-side
import { DataDetailView } from '@/components/data-detail-view';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface DataDetailPageProps {
  params: {
    id: string;
  };
}

export const dynamic = 'force-dynamic'; // Ensure data is fetched on each request

export default async function DataDetailPage({ params }: DataDetailPageProps) {
  const { id } = params;
  console.log(`[DataDetailPage] Rendering page for ID (from params): ${id} (Type: ${typeof id})`);
  let dataEntry = null;
  let error: string | null = null;

  try {
    console.log(`[DataDetailPage] Attempting to fetch data using getDataById with ID: ${id}`);
    // Ensure ID is passed correctly (it should be a string from params)
    dataEntry = await getDataById(id);

    if (dataEntry) {
        console.log(`[DataDetailPage] Successfully fetched data for ID: ${id}. Data:`, JSON.stringify(dataEntry));
    } else {
        // This is the critical point for 404s
        console.warn(`[DataDetailPage] getDataById returned null for ID: ${id}. This indicates the entry was not found in the current in-memory database session. Check if the server restarted after adding the data.`);
    }

  } catch (e) {
    console.error(`[DataDetailPage] Failed to fetch data for ID ${id}:`, e);
    error = `Failed to load data for ID ${id}. Please try again later.`;
    if (e instanceof Error) {
        error = `${error} Details: ${e.message}`;
    }
  }

  // Trigger 404 if no error occurred BUT dataEntry is still null
  if (!error && !dataEntry) {
     console.log(`[DataDetailPage] No data found for ID ${id} (getDataById returned null) and no fetch error occurred. Triggering notFound().`);
     // This explicitly calls the Next.js notFound function, which renders the 404 page.
     // It's the correct way to handle cases where the resource doesn't exist.
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
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-destructive">{error}</p>
          ) : dataEntry ? (
            // Pass the fetched data to the client component for interaction
            // Ensure the ID passed is consistent (string)
            <DataDetailView initialData={dataEntry} entryId={String(id)} />
          ) : (
             // This fallback case should technically not be reached due to the notFound() call.
             // Added just in case of unexpected logic flow.
             <p className="text-destructive">Data entry not found (ID: {id}). It might have been removed or wasn't persisted due to server restart.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
