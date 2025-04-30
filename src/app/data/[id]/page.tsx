// src/app/data/[id]/page.tsx
import { notFound } from 'next/navigation';
import { getDataById, getRelationshipsBySourceId } from '@/services/database'; // Added getRelationshipsBySourceId
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
  let dataEntry = null;
  // Relationships are fetched client-side in DataDetailView for now to handle adding/deleting dynamically
  // let initialRelationships = [];
  let error: string | null = null;

  try {
    // Attempt to fetch data using the ID from the route parameter
    dataEntry = await getDataById(id);
     // Optionally prefetch relationships here if needed for SSR/SEO,
     // but the client component will manage the state primarily.
     // initialRelationships = await getRelationshipsBySourceId(id);

  } catch (e) {
    console.error(`Failed to fetch data or relationships for ID ${id}:`, e);
    error = `Failed to load data for ID ${id}. Please try again later.`;
  }

  // If data entry is not found after attempting fetch (and no error stopped it), show 404
  if (!error && !dataEntry) {
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
            // initialRelationships could be passed if prefetched, but client handles state
            <DataDetailView initialData={dataEntry} entryId={id} />
          ) : (
             // Should ideally be handled by notFound(), but as a fallback:
             <p>Data entry not found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
