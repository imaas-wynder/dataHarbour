// src/components/data-preview-table.tsx
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
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Eye, Edit } from "lucide-react"; // Added Edit icon

interface DataPreviewTableProps {
  data: DataEntry[]; // Changed prop name from initialData to data
}

export function DataPreviewTable({ data }: DataPreviewTableProps) { // Use the 'data' prop
  // Determine table headers dynamically from the first data entry
  // Prioritize common keys if data structures vary, or use a union of keys
  const allKeys = data.reduce((keys, entry) => {
    Object.keys(entry).forEach(key => keys.add(key));
    return keys;
  }, new Set<string>());

  // Define order or filter keys if needed. Let's include 'id' first if present.
  let headers = Array.from(allKeys);
  if (headers.includes('id')) {
    headers = ['id', ...headers.filter(h => h !== 'id')];
  }
  // Exclude complex objects/arrays from direct display for simplicity
  const simpleHeaders = headers.filter(header => {
      if (data.length > 0) {
        const firstValue = data[0][header];
        // Allow null, but exclude complex objects/arrays
        return typeof firstValue !== 'object' || firstValue === null;
      }
      return true; // Show header if no data yet
  });

  // Add an "Actions" header
  const displayHeaders = [...simpleHeaders, 'Actions'];

  return (
    <ScrollArea className="rounded-md border">
      <Table>
        <TableCaption>
          {data.length === 0 ? "No data available matching the current criteria." : "A preview of the current data. Click 'View / Clean' to see details."}
        </TableCaption>
        <TableHeader>
          <TableRow>
            {displayHeaders.map((header) => (
              <TableHead key={header} className="whitespace-nowrap">
                {header === 'Actions' ? header : (header.charAt(0).toUpperCase() + header.slice(1))}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length > 0 ? (
            data.map((entry, index) => (
              <TableRow key={entry.id || `entry-${index}`}>
                {simpleHeaders.map((header) => (
                  <TableCell key={`${entry.id || `entry-${index}`}-${header}`} className="whitespace-nowrap max-w-[200px] truncate">
                    {/* Display value, handle potential null/undefined/objects safely */}
                     {typeof entry[header] === 'object' && entry[header] !== null
                       ? JSON.stringify(entry[header]) // Basic stringify for objects/arrays
                       : String(entry[header] ?? '')}
                  </TableCell>
                ))}
                {/* Actions Cell */}
                <TableCell className="whitespace-nowrap text-right">
                  {entry.id ? (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/data/${entry.id}`}>
                        <Edit className="mr-1 h-3 w-3" /> View / Clean
                      </Link>
                    </Button>
                  ) : (
                    <span className="text-muted-foreground text-xs italic">No ID</span>
                  )}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={displayHeaders.length} className="h-24 text-center">
                No data to display matching the current filter or criteria.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
