-- Add tsvector column for full-text search
-- Note: Prisma uses PascalCase table names (Product, not products)
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create a GIN index on the tsvector column
CREATE INDEX IF NOT EXISTS "Product_search_vector_idx" ON "Product" USING GIN (search_vector);

-- Create a function to update the search vector
CREATE OR REPLACE FUNCTION product_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('russian', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('russian', coalesce(NEW."shortDescription", '')), 'B') ||
    setweight(to_tsvector('russian', coalesce(NEW.description, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update search vector
DROP TRIGGER IF EXISTS product_search_vector_trigger ON "Product";
CREATE TRIGGER product_search_vector_trigger
  BEFORE INSERT OR UPDATE ON "Product"
  FOR EACH ROW
  EXECUTE FUNCTION product_search_vector_update();

-- Update existing rows
UPDATE "Product" SET search_vector =
  setweight(to_tsvector('russian', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('russian', coalesce("shortDescription", '')), 'B') ||
  setweight(to_tsvector('russian', coalesce(description, '')), 'C');
