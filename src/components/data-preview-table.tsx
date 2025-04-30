// src/components/data-preview-table.tsx
"use client";

import type { DataEntry, RelationshipEntry } from "@/services/database"; // Import RelationshipEntry
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
import { Eye, Edit, Link2 } from "lucide-react"; // Added Link2 icon

interface DataPreviewTableProps {
  data: DataEntry[]; // Changed prop name from initialData to data
  relationships: RelationshipEntry[]; // Add relationships prop
}

export function DataPreviewTable({ data, relationships }: DataPreviewTableProps) { // Use the 'data' and 'relationships' props
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
      if (data.length > 0 && data[0] && typeof data[0] === 'object') {
        const firstValue = data[0][header];
        // Allow null, but exclude complex objects/arrays
        return typeof firstValue !== 'object' || firstValue === null;
      }
      return true; // Show header if no data yet or data structure is unexpected
  });

  // Add an "Actions" header and "Relationships" header after "id"
  const displayHeaders = ['id', 'Relationships', ...simpleHeaders.filter(h => h !== 'id'), 'Actions'];

  // Helper to find relationships for a given entry ID
  const getRelatedTargetIds = (entryId: number | string): (number | string)[] => {
    const entryIdStr = String(entryId);
    return relationships
      .filter(rel => String(rel.source_entry_id) === entryIdStr)
      .map(rel => rel.target_entry_id);
  };

  return (
    <ScrollArea className="rounded-md border w-full">
      <Table className="min-w-full"> {/* Ensure table can expand */}
        <TableCaption>
          {data.length === 0 ? "No data available matching the current criteria." : "A preview of the current data. Click 'View / Clean' to see details."}
        </TableCaption>
        <TableHeader>
          <TableRow>
            {displayHeaders.map((header) => (
              <TableHead key={header} className="whitespace-nowrap sticky top-0 bg-background z-10"> {/* Make headers sticky */}
                {header === 'Actions' ? header : (header.charAt(0).toUpperCase() + header.slice(1))}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length > 0 ? (
            data.map((entry, index) => {
               const relatedIds = getRelatedTargetIds(entry.id!);
               return (
              <TableRow key={entry.id || `entry-${index}`}>
                 {/* ID Cell */}
                 <TableCell className="whitespace-nowrap max-w-[100px] truncate font-medium">
                    {entry.id ? String(entry.id) : 'N/A'}
                 </TableCell>

                 {/* Relationships Cell */}
                 <TableCell className="whitespace-nowrap max-w-[200px]">
                  {relatedIds.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {relatedIds.map(targetId => (
                        <Link key={targetId} href={`/data/${targetId}`} className="text-xs bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded hover:bg-accent hover:text-accent-foreground transition-colors">
                          {String(targetId)}
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">None</span>
                  )}
                 </TableCell>

                {/* Dynamic Data Cells (excluding ID) */}
                {simpleHeaders.filter(h => h !== 'id').map((header) => (
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
               );
            })
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
