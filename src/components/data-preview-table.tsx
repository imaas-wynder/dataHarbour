// src/components/data-preview-table.tsx
"use client"; // Keep as client component to receive props smoothly from parent client component

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
  initialData: DataEntry[]; // Renaming prop to reflect it can change on refresh
}

export function DataPreviewTable({ initialData: data }: DataPreviewTableProps) {
  // Determine table headers dynamically from the first data entry
  // Assumes all entries have similar structure, uses first entry as template
  // Recalculate headers based on the current data prop
  const headers = data.length > 0 ? Object.keys(data[0]) : [];

  return (
    <ScrollArea className="rounded-md border">
      <Table>
        <TableCaption>A preview of the current data. {data.length === 0 ? "No data available." : ""}</TableCaption>
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
              // Only show this if there are truly no headers (i.e., initial load failed or empty DB)
              data.length === 0 && <TableHead>No data fields found</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length > 0 ? (
            data.map((entry, index) => (
              <TableRow key={entry.id || `entry-${index}`}>
                {headers.map((header) => (
                  <TableCell key={`${entry.id || `entry-${index}`}-${header}`} className="whitespace-nowrap">
                    {/* Display value, handle potential objects/arrays simply */}
                    {typeof entry[header] === 'object' && entry[header] !== null
                      ? JSON.stringify(entry[header])
                      : String(entry[header] ?? '')}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={headers.length || 1} className="h-24 text-center">
                No data to display. Upload some data or try refreshing.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
       <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
