
// src/services/types.ts

/**
 * Represents a data entry retrieved from the database.
 * The 'id' field corresponds to the 'entry_id' (TEXT) column in PostgreSQL.
 */
export interface DataEntry {
  id: string; // Corresponds to entry_id (TEXT) in the database
  [key: string]: any; // Allows for dynamic keys and any value type from JSONB
}

/**
 * Represents a relationship between two data entries.
 */
export interface RelationshipEntry {
    id: number; // Primary key (SERIAL) for the relationship itself
    source_entry_id: string; // Corresponds to entry_id (TEXT)
    target_entry_id: string; // Corresponds to entry_id (TEXT)
    created_at: string | Date; // TIMESTAMPTZ
}
