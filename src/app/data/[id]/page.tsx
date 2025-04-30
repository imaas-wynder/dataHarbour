// src/app/data/[id]/page.tsx
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
  console.log(`[DataDetailPage] Rendering page for ID: ${id}`);
  let dataEntry = null;
  let error: string | null = null;

  try {
    console.log(`[DataDetailPage] Attempting to fetch data for ID: ${id} using getDataById.`);
    // Attempt to fetch data using the ID from the route parameter
    dataEntry = await getDataById(id);

    if (dataEntry) {
        console.log(`[DataDetailPage] Successfully fetched data for ID: ${id}`);
    } else {
        console.log(`[DataDetailPage] getDataById returned null for ID: ${id}. This will result in a 404 if no other error occurred.`);
    }

  } catch (e) {
    console.error(`[DataDetailPage] Failed to fetch data for ID ${id}:`, e);
    error = `Failed to load data for ID ${id}. Please try again later.`;
    if (e instanceof Error) {
        error = `${error} Details: ${e.message}`;
    }
  }

  // If data entry is not found after attempting fetch (and no error stopped it), show 404
  // This is the crucial check. If getDataById returns null, this triggers the 404.
  if (!error && !dataEntry) {
     console.log(`[DataDetailPage] No data found for ID ${id} and no error occurred. Triggering notFound().`);
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
            <DataDetailView initialData={dataEntry} entryId={id} />
          ) : (
             // This fallback case should ideally not be reached due to the notFound() call above.
             <p>Data entry not found (fallback message).</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
