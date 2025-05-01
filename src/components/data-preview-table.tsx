
// src/components/data-preview-table.tsx
"use client";

import type { DataEntry, RelationshipEntry } from "@/services/types"; // Updated import path
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
import { Eye, Edit, Link2 } from "lucide-react";

interface DataPreviewTableProps {
  data: DataEntry[];
  relationships: RelationshipEntry[];
}

export function DataPreviewTable({ data, relationships }: DataPreviewTableProps) {
  const allKeys = data.reduce((keys, entry) => {
    Object.keys(entry).forEach(key => keys.add(key));
    return keys;
  }, new Set<string>());

  let headers = Array.from(allKeys);
  if (headers.includes('id')) {
    headers = ['id', ...headers.filter(h => h !== 'id')];
  }
  const simpleHeaders = headers.filter(header => {
      if (data.length > 0 && data[0] && typeof data[0] === 'object') {
        const firstValue = data[0][header];
        return typeof firstValue !== 'object' || firstValue === null;
      }
      return true;
  });

  const displayHeaders = ['id', 'Relationships', ...simpleHeaders.filter(h => h !== 'id'), 'Actions'];

  const getRelatedTargetIds = (entryId: number | string): (number | string)[] => {
    const entryIdStr = String(entryId);
    return relationships
      .filter(rel => String(rel.source_entry_id) === entryIdStr)
      .map(rel => rel.target_entry_id);
  };

  return (
    <ScrollArea className="rounded-md border w-full">
      <Table className="min-w-full">
        <TableCaption>
          {data.length === 0 ? "No data available matching the current criteria." : "A preview of the current data. Click 'View / Clean' to see details."}
        </TableCaption>
        <TableHeader>
          <TableRow>
            {displayHeaders.map((header) => (
              <TableHead key={header} className="whitespace-nowrap sticky top-0 bg-background z-10">
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
                   <TableCell className="whitespace-nowrap max-w-[100px] truncate font-medium">
                      {entry.id ? String(entry.id) : 'N/A'}
                   </TableCell>
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
                  {simpleHeaders.filter(h => h !== 'id').map((header) => (
                    <TableCell key={`${entry.id || `entry-${index}`}-${header}`} className="whitespace-nowrap max-w-[200px] truncate">
                       {typeof entry[header] === 'object' && entry[header] !== null
                         ? JSON.stringify(entry[header])
                         : String(entry[header] ?? '')}
                    </TableCell>
                  ))}
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
