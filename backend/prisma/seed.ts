import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to seed the database.");
}

const adapter = new PrismaPg({
  connectionString: databaseUrl,
});

const prisma = new PrismaClient({
  adapter,
});

/* --------------------------------------------------
 * Genres
 * -------------------------------------------------- */

const genres = [
  ["romance", "Romance"],
  ["fantasy", "Fantasy"],
  ["science-fiction", "Science Fiction"],
  ["mystery", "Mystery"],
  ["thriller", "Thriller"],
  ["horror", "Horror"],
  ["adventure", "Adventure"],
  ["historical-fiction", "Historical Fiction"],
  ["young-adult", "Young Adult"],
  ["humor", "Humor"],
  ["poetry", "Poetry"],
  ["fan-fiction", "Fan Fiction"],
  ["non-fiction", "Non-fiction"],
  ["short-story", "Short Story"],
] as const;

/* --------------------------------------------------
 * Fake authors
 * -------------------------------------------------- */

const authors = [
  {
    username: "lina_writer",
    displayName: "Lina",
    email: "lina.writer@example.com",
    bio: "A fictional writer created for development and testing.",
  },
  {
    username: "aria_writer",
    displayName: "Aria",
    email: "aria.writer@example.com",
    bio: "A fictional writer created for development and testing.",
  },
  {
    username: "nora_writer",
    displayName: "Nora",
    email: "nora.writer@example.com",
    bio: "A fictional writer created for development and testing.",
  },
  {
    username: "elena_writer",
    displayName: "Elena",
    email: "elena.writer@example.com",
    bio: "A fictional writer created for development and testing.",
  },
  {
    username: "mila_writer",
    displayName: "Mila",
    email: "mila.writer@example.com",
    bio: "A fictional writer created for development and testing.",
  },
  {
    username: "sara_writer",
    displayName: "Sara",
    email: "sara.writer@example.com",
    bio: "A fictional writer created for development and testing.",
  },
  {
    username: "luna_writer",
    displayName: "Luna",
    email: "luna.writer@example.com",
    bio: "A fictional writer created for development and testing.",
  },
] as const;

/* --------------------------------------------------
 * Fake stories
 * -------------------------------------------------- */

const stories = [
  {
    title: "The Last Train Home",
    slug: "the-last-train-home",
    description:
      "A young woman returns to the railway station where she lost someone important three years ago. An old letter may change everything she remembers about that night.",
    genreSlug: "romance",
    coverUrl: "/stories/story-1.jpg",
    status: "ONGOING" as const,
    tags: [
      ["romance", "Romance"],
      ["love", "Love"],
      ["past", "Past"],
    ],
    chapters: [
      {
        title: "The Station",
        content: `
Rain tapped softly against the glass roof of the old railway station.

Lina stood beside the empty platform and watched the clock above the entrance.

The train was already ten minutes late.

She reached into her coat pocket and touched the folded letter she had carried for three years.

She had promised herself that she would never come back.

Yet here she was.

Some places have a strange way of remembering us.

And sometimes, they remember more than we do.
`,
      },
      {
        title: "The Letter",
        content: `
The envelope was old and slightly damaged around the edges.

There was only one sentence written on it.

"Open this when you are ready."

Lina had read those words hundreds of times.

But she had never opened it.

Tonight was different.

She slowly tore the envelope apart.

The first sentence made her stop breathing.

"If you are reading this, then you finally came back."

She looked toward the railway tracks.

A train was approaching in the distance.
`,
      },
      {
        title: "Three Years Later",
        content: `
The train stopped.

People began leaving the platform one by one.

Lina looked at every face.

Then she saw him.

Three years had passed, but some people were impossible to forget.

He stopped a few steps away from her.

Neither of them spoke.

Lina held the letter tightly in her hand.

For the first time, she understood that the past was not always something to escape.

Sometimes it was something waiting to be understood.
`,
      },
    ],
  },

  {
    title: "The House Behind the Fog",
    slug: "the-house-behind-the-fog",
    description:
      "At the end of a forgotten road stands an abandoned house. Nobody in the village talks about it, but someone seems to be waiting inside.",
    genreSlug: "mystery",
    coverUrl: "/stories/story-2.jpg",
    status: "ONGOING" as const,
    tags: [
      ["mystery", "Mystery"],
      ["secret", "Secret"],
      ["house", "House"],
    ],
    chapters: [
      {
        title: "The Road",
        content: `
The road disappeared into a thick wall of fog.

Aria stopped the car.

At the end of the road stood the house.

Its windows were broken and its walls were covered with years of dust.

An old man from the village had warned her.

"Do not go there after sunset."

Aria had never been good at following warnings.

She grabbed her flashlight and stepped out of the car.
`,
      },
      {
        title: "Someone Inside",
        content: `
The front door was already open.

Aria pushed it gently.

The house answered with a long wooden creak.

She stepped inside.

Everything smelled of dust and rain.

Then she heard a voice.

"You finally came back."

Aria froze.

She had never been inside this house before.

At least, that was what she believed.
`,
      },
      {
        title: "The Last Room",
        content: `
At the end of the hallway was a locked room.

Aria found an old key beneath a broken vase.

Inside were dozens of photographs.

Every photograph showed people who had disappeared from the village years ago.

Then she saw the final photograph.

It showed her.

The date written underneath was twenty years old.

Aria dropped the photograph.

Someone whispered behind her.

"You were always supposed to return."
`,
      },
    ],
  },

  {
    title: "The City Without Clocks",
    slug: "the-city-without-clocks",
    description:
      "In a strange city where time has stopped, Nora discovers that she is the only person who can still move.",
    genreSlug: "fantasy",
    coverUrl: "/stories/story-3.jpg",
    status: "ONGOING" as const,
    tags: [
      ["magic", "Magic"],
      ["time", "Time"],
      ["fantasy", "Fantasy"],
    ],
    chapters: [
      {
        title: "Silence",
        content: `
The first thing Nora noticed was the silence.

No cars.

No birds.

Not even the sound of the wind.

She looked at the giant clock in the center of the city.

Every hand had stopped at twelve.

A man stood in the middle of the street.

He did not move.

Neither did anyone else.
`,
      },
      {
        title: "The Moving Clock",
        content: `
Nora raised her hand.

A single drop of rain was floating in front of her.

She touched it.

The drop landed on her finger.

It was the only thing moving.

"Why can I still move?" she whispered.

The clock suddenly made a sound.

Tick.

Every person in the city moved again.

Then the clock stopped.

Nora knew something was wrong.
`,
      },
      {
        title: "Midnight",
        content: `
That night Nora discovered the truth.

Every twelve hours, the city stopped.

But this time something had changed.

The clock reached midnight.

Nothing stopped.

A man appeared behind her.

"You should not be here," he said.

Nora turned around.

He was holding a broken pocket watch.

And the watch was still moving.
`,
      },
    ],
  },

  {
    title: "A Letter for Tomorrow",
    slug: "a-letter-for-tomorrow",
    description:
      "A letter that was never meant to be sent brings two people face to face with everything they tried to forget.",
    genreSlug: "short-story",
    coverUrl: "/stories/story-4.jpg",
    status: "COMPLETED" as const,
    tags: [
      ["letter", "Letter"],
      ["memory", "Memory"],
      ["goodbye", "Goodbye"],
    ],
    chapters: [
      {
        title: "The Letter",
        content: `
Sara wrote the letter for tomorrow.

Not today.

Not yesterday.

Tomorrow.

She started writing slowly.

"If you are reading this, then I could not tell you what I needed to say."

She stopped.

Some words were harder to write than others.

Especially the words that mattered.
`,
      },
      {
        title: "Someone at the Door",
        content: `
The doorbell rang.

Sara looked at the unfinished letter.

Nobody was supposed to visit.

She walked toward the door.

For three years, she had imagined this moment.

Her hand rested on the handle.

She took a breath.

Then she opened the door.
`,
      },
      {
        title: "Tomorrow",
        content: `
He was standing there.

Neither of them spoke.

Sara looked down at the letter in her hand.

Three years ago, she had believed that some things were impossible to repair.

Now she understood something different.

Some conversations should not be saved for tomorrow.

Some words have to be spoken today.
`,
      },
    ],
  },

  {
    title: "The Tree That Remembered",
    slug: "the-tree-that-remembered",
    description:
      "An old tree in a family garden remembers every person who ever sat beneath its branches.",
    genreSlug: "fantasy",
    coverUrl: "/stories/story-5.jpg",
    status: "ONGOING" as const,
    tags: [
      ["memory", "Memory"],
      ["family", "Family"],
      ["secret", "Secret"],
    ],
    chapters: [
      {
        title: "The Old Tree",
        content: `
Grandmother always said the tree remembered everything.

I never believed her.

Until one summer afternoon, I placed my hand against its trunk.

The garden suddenly changed.

The house looked younger.

The flowers were different.

And a woman I had never seen before was standing beneath the tree.
`,
      },
      {
        title: "The Memories",
        content: `
The woman was young.

Grandfather was standing beside her.

They were laughing.

Then the scene changed.

A child appeared.

Then another memory.

A rainy afternoon.

A suitcase.

A young boy leaving the house.

I realized I had never heard anyone in my family talk about him.
`,
      },
      {
        title: "The Family Secret",
        content: `
I pulled my hand away.

The garden returned to normal.

But I could not forget what I had seen.

Grandmother had protected the tree for decades.

Now I understood why.

It remembered every secret our family had buried.

And I had just discovered the oldest one.
`,
      },
    ],
  },

  {
    title: "After Midnight",
    slug: "after-midnight",
    description:
      "There was one simple rule in the house: never open the door after midnight. One night, someone knocked three times.",
    genreSlug: "horror",
    coverUrl: "/stories/story-6.jpg",
    status: "ONGOING" as const,
    tags: [
      ["horror", "Horror"],
      ["night", "Night"],
      ["fear", "Fear"],
    ],
    chapters: [
      {
        title: "Three Knocks",
        content: `
The first knock came at twelve ten.

Knock.

I turned off the television.

The second knock came a few seconds later.

Knock.

Nobody was supposed to visit that night.

I looked at the clock.

12:12 AM.
`,
      },
      {
        title: "The Phone Call",
        content: `
The third knock was quieter.

Knock.

I walked toward the door.

My hand reached for the handle.

Then the telephone rang.

I answered.

My mother's voice came from the other side.

"Whatever happens, do not open the door."

I swallowed.

"Mom... where are you?"

There was a long silence.

Then she answered.

"Outside your door."
`,
      },
      {
        title: "Behind the Door",
        content: `
I dropped the phone.

Someone knocked again.

This time, the sound came from inside the house.

I slowly turned around.

The hallway was empty.

Then I heard footsteps.

They were coming from my bedroom.

And they were getting closer.
`,
      },
    ],
  },

  {
    title: "Across the Ocean",
    slug: "across-the-ocean",
    description:
      "A small ship discovers an island that does not appear on any map. What waits there may change the lives of everyone on board.",
    genreSlug: "adventure",
    coverUrl: "/stories/story-7.jpg",
    status: "COMPLETED" as const,
    tags: [
      ["adventure", "Adventure"],
      ["ocean", "Ocean"],
      ["island", "Island"],
    ],
    chapters: [
      {
        title: "Three Days at Sea",
        content: `
They had been at sea for three days.

There was no land in sight.

The ocean looked calm, but the captain knew better.

He opened the old map.

A small island was marked in the center of the ocean.

It did not appear on any modern map.

Nobody knew who had drawn it.
`,
      },
      {
        title: "The Island",
        content: `
On the fourth morning, someone shouted.

"Land!"

Everyone ran toward the deck.

A dark shape appeared through the fog.

The captain looked at the map.

The island was exactly where it was supposed to be.

But something was wrong.

There were lights.

Hundreds of them.

Someone was living there.
`,
      },
      {
        title: "The City on the Water",
        content: `
As the ship moved closer, the lights became clearer.

A city stood on the water.

Its buildings were enormous.

None of them appeared on the map.

The captain lowered the telescope.

"We are turning around," he said.

Before anyone could move, every light in the city turned toward the ship.

Then the ocean became completely still.
`,
      },
    ],
  },
] as const;

/* --------------------------------------------------
 * Helpers
 * -------------------------------------------------- */

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/* --------------------------------------------------
 * Seed
 * -------------------------------------------------- */

async function main(): Promise<void> {
  console.log("Starting database seed...");

  /*
   * --------------------------------------------------
   * 1. Genres
   * --------------------------------------------------
   */

  const genreMap = new Map<string, string>();

  for (const [index, [slug, name]] of genres.entries()) {
    const genre = await prisma.genre.upsert({
      where: {
        slug,
      },
      update: {
        name,
        isActive: true,
        sortOrder: index,
      },
      create: {
        slug,
        name,
        sortOrder: index,
      },
    });

    genreMap.set(genre.slug, genre.id);
  }

  console.log(`✓ ${genres.length} genres seeded.`);

  /*
   * --------------------------------------------------
   * 2. Fake users
   * --------------------------------------------------
   */

  const authorIds: string[] = [];

  for (const author of authors) {
    const user = await prisma.user.upsert({
      where: {
        email: author.email,
      },
      update: {
        username: author.username,
        usernameNormalized: author.username.toLowerCase(),
        displayName: author.displayName,
        bio: author.bio,
        status: "ACTIVE",
        role: "USER",
      },
      create: {
        email: author.email,
        username: author.username,
        usernameNormalized: author.username.toLowerCase(),
        passwordHash: "$2b$10$abcdefghijklmnopqrstuuabcdefghijklmnopqrstuvwxyz",
        displayName: author.displayName,
        bio: author.bio,
        birthDate: new Date("2000-01-01"),
        termsAcceptedAt: new Date(),
        termsVersion: "1.0",
        status: "ACTIVE",
        role: "USER",
      },
    });

    authorIds.push(user.id);
  }

  console.log(`✓ ${authors.length} fake authors seeded.`);

  /*
   * --------------------------------------------------
   * 3. Stories
   * --------------------------------------------------
   */

  for (const [storyIndex, storyData] of stories.entries()) {
    const authorId = authorIds[storyIndex];

    if (!authorId) {
      throw new Error(`No author found for story index ${storyIndex}.`);
    }

    const genreId = genreMap.get(storyData.genreSlug);

    if (!genreId) {
      throw new Error(`Genre "${storyData.genreSlug}" was not found.`);
    }

    /*
     * Create/update story
     */

    const story = await prisma.story.upsert({
      where: {
        slug: storyData.slug,
      },
      update: {
        authorId,
        genreId,
        title: storyData.title,
        description: storyData.description,
        coverUrl: storyData.coverUrl,
        language: "en",
        status: storyData.status,
        visibility: "PUBLIC",
        rights: "ALL_RIGHTS_RESERVED",
        moderationState: "VISIBLE",
        isMature: false,
        publishedAt: new Date(),
      },
      create: {
        authorId,
        genreId,
        title: storyData.title,
        slug: storyData.slug,
        description: storyData.description,
        coverUrl: storyData.coverUrl,
        language: "en",
        status: storyData.status,
        visibility: "PUBLIC",
        rights: "ALL_RIGHTS_RESERVED",
        moderationState: "VISIBLE",
        isMature: false,
        publishedAt: new Date(),
      },
    });

    /*
     * --------------------------------------------------
     * Tags
     * --------------------------------------------------
     */

    const tagIds: string[] = [];

    for (const [slug, name] of storyData.tags) {
      const tag = await prisma.tag.upsert({
        where: {
          slug,
        },
        update: {
          name,
        },
        create: {
          slug,
          name,
        },
      });

      tagIds.push(tag.id);
    }

    /*
     * Remove old story-tag relations
     * so the seed stays deterministic.
     */

    await prisma.storyTag.deleteMany({
      where: {
        storyId: story.id,
      },
    });

    /*
     * Recreate story-tag relations.
     */

    for (const tagId of tagIds) {
      await prisma.storyTag.create({
        data: {
          storyId: story.id,
          tagId,
        },
      });
    }

    /*
     * --------------------------------------------------
     * Chapters
     * --------------------------------------------------
     */

    for (const [chapterIndex, chapterData] of storyData.chapters.entries()) {
      const position = chapterIndex + 1;

      await prisma.chapter.upsert({
        where: {
          storyId_position: {
            storyId: story.id,
            position,
          },
        },
        update: {
          title: chapterData.title,
          content: chapterData.content.trim(),
          version: 1,
          status: "PUBLISHED",
          moderationState: "VISIBLE",
          wordCount: countWords(chapterData.content),
          publishedAt: new Date(),
        },
        create: {
          storyId: story.id,
          title: chapterData.title,
          position,
          content: chapterData.content.trim(),
          version: 1,
          status: "PUBLISHED",
          moderationState: "VISIBLE",
          wordCount: countWords(chapterData.content),
          publishedAt: new Date(),
        },
      });
    }

    console.log(`  ✓ Story ${storyIndex + 1}/7: ${storyData.title}`);
  }

  console.log("✓ 7 stories seeded.");
  console.log("✓ 21 chapters seeded.");
  console.log("✓ Story tags connected.");
  console.log("Database seed completed successfully.");
}

/* --------------------------------------------------
 * Run
 * -------------------------------------------------- */

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error("Database seed failed:");
    console.error(error);

    await prisma.$disconnect();

    process.exitCode = 1;
  });
