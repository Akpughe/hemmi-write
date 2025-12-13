-- Fix generated_documents table column name
-- Ensure is_current exists and is_final doesn't

DO $$
BEGIN
    -- Check if is_final column exists and rename it to is_current
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'generated_documents'
        AND column_name = 'is_final'
    ) THEN
        -- Drop the unique index if it exists with either name
        DROP INDEX IF EXISTS generated_documents_unique_final;
        DROP INDEX IF EXISTS generated_documents_unique_current;

        -- Rename the column
        ALTER TABLE generated_documents
        RENAME COLUMN is_final TO is_current;

        -- Recreate the unique index with the correct column name
        CREATE UNIQUE INDEX generated_documents_unique_current
        ON generated_documents(project_id)
        WHERE is_current = TRUE;

        RAISE NOTICE 'Renamed is_final to is_current in generated_documents table';
    ELSIF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'generated_documents'
        AND column_name = 'is_current'
    ) THEN
        -- If neither exists, add is_current
        ALTER TABLE generated_documents
        ADD COLUMN is_current BOOLEAN NOT NULL DEFAULT TRUE;

        CREATE UNIQUE INDEX generated_documents_unique_current
        ON generated_documents(project_id)
        WHERE is_current = TRUE;

        RAISE NOTICE 'Added is_current column to generated_documents table';
    ELSE
        RAISE NOTICE 'Column is_current already exists, no changes needed';
    END IF;
END $$;

-- Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
