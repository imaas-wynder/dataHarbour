"use client";

import type { DataEntry } from "@/services/database";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface DataPreviewTableProps {
  initialData: DataEntry[];
}

export function DataPreviewTable({ initialData }: DataPreviewTableProps) {
  // Determine table headers dynamically from the first data entry
  // Assumes all entries have similar structure, uses first entry as template
  const headers = initialData.length > 0 ? Object.keys(initialData[0]) : [];

  return (
    <ScrollArea className="rounded-md border">
      <Table>
        <TableCaption>A preview of recently uploaded data.</TableCaption>
        <TableHeader>
          <TableRow>
            {headers.length > 0 ? (
              headers.map((header) => (
                <TableHead key={header} className="whitespace-nowrap">
                  {/* Basic capitalization for header */}
                  {header.charAt(0).toUpperCase() + header.slice(1)}
                </TableHead>
              ))
            ) : (
              <TableHead>No data available</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {initialData.length > 0 ? (
            initialData.map((entry, index) => (
              <TableRow key={entry.id || index}>
                {headers.map((header) => (
                  <TableCell key={`${entry.id || index}-${header}`} className="whitespace-nowrap">
                    {/* Display value, handle potential objects/arrays simply */}
                    {typeof entry[header] === 'object' && entry[header] !== null
                      ? JSON.stringify(entry[header])
                      : String(entry[header])}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={headers.length || 1} className="h-24 text-center">
                No data to display. Upload some data using the form above.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
       <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
