import { NextResponse, type NextRequest } from 'next/server';
import { addData } from '@/services/database';
import type { DataEntry } from '@/services/database';
import { revalidatePath } from 'next/cache';

export async function POST(request: NextRequest) {
  try {
    const data: DataEntry | DataEntry[] = await request.json();

    if (!data || (typeof data !== 'object')) {
      return NextResponse.json({ error: 'Invalid data format. Expected JSON object or array.' }, { status: 400 });
    }

    console.log("API Route: Received data for upload:", data);

    let success = true;
    let results: boolean[] = [];

    if (Array.isArray(data)) {
      results = await Promise.all(data.map(entry => addData(entry)));
      success = results.every(result => result);
    } else {
      success = await addData(data);
    }

    if (success) {
        console.log("API Route: Data added successfully.");
        revalidatePath('/'); // Revalidate the home page cache
        return NextResponse.json({ message: 'Data added successfully' }, { status: 201 });
    } else {
       console.error("API Route: Failed to add one or more entries.", results);
       // Provide more detail if it was an array upload
       const failedCount = Array.isArray(data) ? results.filter(r => !r).length : (success ? 0 : 1);
       const totalCount = Array.isArray(data) ? data.length : 1;
       return NextResponse.json({ error: `Failed to add ${failedCount} out of ${totalCount} entries.` }, { status: 500 });
    }

  } catch (error) {
    console.error('API Route: Error processing request:', error);
     let errorMessage = 'Internal Server Error';
     if (error instanceof SyntaxError) {
         errorMessage = 'Invalid JSON payload';
         return NextResponse.json({ error: errorMessage }, { status: 400 });
     } else if (error instanceof Error) {
         errorMessage = error.message; // Be cautious exposing internal error messages
     }

    return NextResponse.json({ error: 'Failed to process data', details: errorMessage }, { status: 500 });
  }
}

// Optional: Add GET handler if needed later
// export async function GET() {
//   // Implementation for fetching data via API
//   return NextResponse.json({ message: 'GET method not implemented yet' });
// }
