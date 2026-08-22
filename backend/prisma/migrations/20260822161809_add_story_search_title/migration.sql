-- AlterTable
ALTER TABLE "stories"
ADD COLUMN "search_title" TEXT NOT NULL DEFAULT '';

-- Update the existing search trigger function.
CREATE OR REPLACE FUNCTION update_story_search_text()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW."search_title" := writing_search_text(
    NEW."title",
    ''
  );

  NEW."search_text" := writing_search_text(
    NEW."title",
    NEW."description"
  );

  RETURN NEW;
END;
$$;

-- Populate search_title for existing stories.
UPDATE "stories"
SET "search_title" = writing_search_text(
  "title",
  ''
);

-- CreateIndex
CREATE INDEX "stories_search_title_trgm_idx"
ON "stories"
USING GIN ("search_title" gin_trgm_ops);