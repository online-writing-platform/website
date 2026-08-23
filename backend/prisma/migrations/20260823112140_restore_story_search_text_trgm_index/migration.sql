-- CreateIndex
CREATE INDEX "stories_search_text_trgm_idx" ON "stories" USING GIN ("search_text" gin_trgm_ops);
