-- This migration was originally committed as a byte-duplicate of
-- 20260417223000_comprasnet_additive_audit/migration.sql and caused a failure
-- when Prisma replayed the history against the shadow database
-- ("type AdditiveType already exists"). Since every CREATE / ALTER in that
-- duplicate was already executed by the previous migration, neutralizing this
-- migration to a no-op restores shadow-DB validation without changing the
-- schema state on databases where it had already been force-applied.
SELECT 1;
