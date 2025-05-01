
// src/services/types.ts

/**
 * Represents a data entry to be stored in the database.
 * Structure can be flexible.
 */
export interface DataEntry {
  id?: number | string; // Optional ID, assigned by DB if missing
  [key: string]: any; // Allows for dynamic keys and any value type
}

/**
 * Represents a relationship between two data entries.
 */
export interface RelationshipEntry {
    id?: number; // Primary key for the relationship itself
    source_entry_id: number | string;
    target_entry_id: number | string;
    created_at?: string | Date;
}
