// --- Schema Initialization ---
const CREATE_DATASETS_TABLE = `
CREATE TABLE IF NOT EXISTS datasets (
    name TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW()
);`;

const CREATE_DATA_ENTRIES_TABLE = `
CREATE TABLE IF NOT EXISTS data_entries (
    internal_id SERIAL PRIMARY KEY,
    dataset_name TEXT NOT NULL REFERENCES datasets(name) ON DELETE CASCADE,
    entry_id TEXT NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (dataset_name, entry_id)
);`;

const CREATE_RELATIONSHIPS_TABLE = `
CREATE TABLE IF NOT EXISTS relationships (
    id SERIAL PRIMARY KEY,
    dataset_name TEXT NOT NULL REFERENCES datasets(name) ON DELETE CASCADE,
    source_entry_id TEXT NOT NULL,
    target_entry_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (dataset_name, source_entry_id, target_entry_id),
    FOREIGN KEY (dataset_name, source_entry_id) REFERENCES data_entries (dataset_name, entry_id) ON DELETE CASCADE,
    FOREIGN KEY (dataset_name, target_entry_id) REFERENCES data_entries (dataset_name, entry_id) ON DELETE CASCADE
);`;

const SHOW_ALL_TABLES = `dt`;
const SHOW_ALL_DATABASES = `l`;
const SHOW_ALL_RELATIONSHIPS = `SELECT
    tc.table_name,
    kcu.column_name AS source_column,
    ccu.table_name AS target_table,
    ccu.column_name AS target_column
FROM
    information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY';`;

export {
    SHOW_ALL_TABLES,
    SHOW_ALL_DATABASES,
    SHOW_ALL_RELATIONSHIPS,
    CREATE_DATASETS_TABLE,
    CREATE_DATA_ENTRIES_TABLE,
    CREATE_RELATIONSHIPS_TABLE
}