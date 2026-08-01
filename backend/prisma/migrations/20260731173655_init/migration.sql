-- CreateTable
CREATE TABLE "comments" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "chapter_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "genres" (
    "id" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "slug" VARCHAR(60) NOT NULL,

    CONSTRAINT "genres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_GenreToStory" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_GenreToStory_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "comments_user_id_idx" ON "comments"("user_id");

-- CreateIndex
CREATE INDEX "comments_chapter_id_idx" ON "comments"("chapter_id");

-- CreateIndex
CREATE UNIQUE INDEX "genres_name_key" ON "genres"("name");

-- CreateIndex
CREATE UNIQUE INDEX "genres_slug_key" ON "genres"("slug");

-- CreateIndex
CREATE INDEX "_GenreToStory_B_index" ON "_GenreToStory"("B");

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GenreToStory" ADD CONSTRAINT "_GenreToStory_A_fkey" FOREIGN KEY ("A") REFERENCES "genres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GenreToStory" ADD CONSTRAINT "_GenreToStory_B_fkey" FOREIGN KEY ("B") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
