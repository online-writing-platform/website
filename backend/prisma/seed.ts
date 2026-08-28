import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "argon2";
import { createHash } from "node:crypto";
import { PrismaClient } from "../src/generated/prisma/client.js";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to seed the database.");
}

if (
  process.env.NODE_ENV === "production" &&
  process.env.ALLOW_PRODUCTION_SEED !== "true"
) {
  throw new Error(
    "Production seed is disabled. Set ALLOW_PRODUCTION_SEED=true only for an intentional demo environment.",
  );
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

// Fake authors

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

  // Persian fake authors

  {
    username: "darya_writer",
    displayName: "دریا",
    email: "darya.writer@example.com",
    bio: "نویسنده‌ای خیالی برای توسعه و آزمایش نسخه فارسی پلتفرم.",
  },
  {
    username: "roya_writer",
    displayName: "رویا",
    email: "roya.writer@example.com",
    bio: "نویسنده‌ای خیالی برای توسعه و آزمایش نسخه فارسی پلتفرم.",
  },
  {
    username: "parisa_writer",
    displayName: "پریسا",
    email: "parisa.writer@example.com",
    bio: "نویسنده‌ای خیالی برای توسعه و آزمایش نسخه فارسی پلتفرم.",
  },
  {
    username: "negar_writer",
    displayName: "نگار",
    email: "negar.writer@example.com",
    bio: "نویسنده‌ای خیالی برای توسعه و آزمایش نسخه فارسی پلتفرم.",
  },
  {
    username: "shabnam_writer",
    displayName: "شبنم",
    email: "shabnam.writer@example.com",
    bio: "نویسنده‌ای خیالی برای توسعه و آزمایش نسخه فارسی پلتفرم.",
  },
  {
    username: "mahtab_writer",
    displayName: "مهتاب",
    email: "mahtab.writer@example.com",
    bio: "نویسنده‌ای خیالی برای توسعه و آزمایش نسخه فارسی پلتفرم.",
  },
  {
    username: "bahar_writer",
    displayName: "بهار",
    email: "bahar.writer@example.com",
    bio: "نویسنده‌ای خیالی برای توسعه و آزمایش نسخه فارسی پلتفرم.",
  },
  {
    username: "ava_writer",
    displayName: "آوا",
    email: "ava.writer@example.com",
    bio: "نویسنده‌ای خیالی برای توسعه و آزمایش نسخه فارسی پلتفرم.",
  },
  {
    username: "setareh_writer",
    displayName: "ستاره",
    email: "setareh.writer@example.com",
    bio: "نویسنده‌ای خیالی برای توسعه و آزمایش نسخه فارسی پلتفرم.",
  },
  {
    username: "yasaman_writer",
    displayName: "یاسمن",
    email: "yasaman.writer@example.com",
    bio: "نویسنده‌ای خیالی برای توسعه و آزمایش نسخه فارسی پلتفرم.",
  },
] as const;

/* --------------------------------------------------
 * Fake stories
 * -------------------------------------------------- */

const englishStories = [
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
 * Persian fake stories
 * -------------------------------------------------- */

const persianStories = [
  {
    title: "صدای باران پشت پنجره",
    slug: "sedaye-baran-poshte-panjere",
    description:
      "دختری پس از سال‌ها به خانه قدیمی خانواده بازمی‌گردد. صدای باران و یادداشتی پشت پنجره، خاطره‌ای فراموش‌شده را دوباره زنده می‌کند.",
    genreSlug: "romance",
    coverUrl: "/stories/story-1.jpg",
    status: "ONGOING" as const,
    tags: [
      ["baran", "باران"],
      ["entezar", "انتظار"],
      ["eshgh", "عشق"],
    ],
    chapters: [
      {
        title: "خانه قدیمی",
        content: `
باران از صبح شروع شده بود و بی‌وقفه روی شیشه‌های خانه می‌زد.

دریا چمدانش را کنار در گذاشت و به اتاقی نگاه کرد که سال‌ها کسی واردش نشده بود.

همه‌چیز همان‌طور باقی مانده بود؛ میز چوبی، پرده‌های سفید و صندلی کنار پنجره.

فقط یک چیز تغییر کرده بود.

روی شیشه، از سمت داخل، جمله‌ای با انگشت نوشته شده بود.

«بالاخره برگشتی.»

دریا دستش را روی نوشته کشید.

گردوغبار کنار رفت، اما جمله هنوز آنجا بود.
`,
      },
      {
        title: "یادداشت پشت پرده",
        content: `
پشت پرده پاکتی زردرنگ افتاده بود.

نام دریا با خطی آشنا روی آن نوشته شده بود.

همان خطی که سال‌ها تلاش کرده بود فراموشش کند.

پاکت را باز کرد.

داخل آن فقط یک تکه کاغذ بود.

«اگر روزی برگشتی، ساعت پنج کنار ایستگاه منتظرت می‌مانم.»

دریا به ساعت دیواری نگاه کرد.

چهار و چهل دقیقه بود.

باران شدیدتر شد.
`,
      },
      {
        title: "ساعت پنج",
        content: `
ایستگاه تقریباً خالی بود.

دریا زیر سایه‌بان ایستاد و به ریل‌هایی نگاه کرد که در مه گم می‌شدند.

ساعت ایستگاه پنج بار زنگ زد.

برای چند لحظه هیچ اتفاقی نیفتاد.

بعد مردی از انتهای سکو ظاهر شد.

چهره‌اش تغییر کرده بود، اما نگاهش همان بود.

دریا پاکت را در دست فشرد.

بعضی انتظارها تمام نمی‌شوند.

فقط سال‌ها طول می‌کشد تا دوباره آن‌ها را به یاد بیاوریم.
`,
      },
    ],
  },

  {
    title: "آخرین فانوس",
    slug: "akharin-fanoos",
    description:
      "در روستایی ساحلی، هر شب فانوسی روی صخره روشن می‌شود؛ با اینکه نگهبان فانوس سال‌ها پیش ناپدید شده است.",
    genreSlug: "mystery",
    coverUrl: "/stories/story-2.jpg",
    status: "ONGOING" as const,
    tags: [
      ["fanoos", "فانوس"],
      ["raaz", "راز"],
      ["darya", "دریا"],
    ],
    chapters: [
      {
        title: "نور روی صخره",
        content: `
مردم روستا عادت کرده بودند پس از غروب به صخره نگاه نکنند.

هر شب، درست در ساعت یازده، فانوس متروکه روشن می‌شد.

نگهبان آن پانزده سال پیش در دریا ناپدید شده بود.

هیچ‌کس حاضر نبود برای خاموش‌کردن نور به آنجا برود.

رویا تازه به روستا آمده بود و داستان‌های مردم را باور نمی‌کرد.

دوربینش را برداشت و مسیر صخره را بالا رفت.

وقتی به فانوس رسید، در آن از داخل باز شد.
`,
      },
      {
        title: "دفتر نگهبان",
        content: `
اتاق فانوس بوی نمک و چوب خیس می‌داد.

روی میز، دفتری باز مانده بود.

آخرین جمله با جوهری کم‌رنگ نوشته شده بود.

«کشتی امشب بازمی‌گردد، اما نباید اجازه دهم به ساحل برسد.»

رویا صفحه بعد را ورق زد.

سفید بود.

بعد صدای زنگی از میان مه آمد.

نوری دوردست روی آب ظاهر شد.

کشتی‌ای سیاه به‌آرامی به ساحل نزدیک می‌شد.
`,
      },
      {
        title: "کشتی بی‌نام",
        content: `
رویا از پله‌های فانوس بالا رفت.

چراغ بدون نفت می‌سوخت.

وقتی نور را به‌سمت دریا چرخاند، کشتی ایستاد.

آدم‌هایی روی عرشه ایستاده بودند.

هیچ‌کدام تکان نمی‌خوردند.

مردی با لباس نگهبان میان آن‌ها بود.

سرش را بالا آورد و مستقیم به رویا نگاه کرد.

سپس با دست به پشت سر او اشاره کرد.

رویا برگشت.

دفتر روی میز دیگر باز نبود.
`,
      },
    ],
  },

  {
    title: "شهر زیر کوه",
    slug: "shahr-zire-kooh",
    description:
      "پسری نوجوان در دل کوه دری سنگی پیدا می‌کند که به شهری فراموش‌شده و مردمی که زمان برایشان متوقف شده، راه دارد.",
    genreSlug: "fantasy",
    coverUrl: "/stories/story-3.jpg",
    status: "ONGOING" as const,
    tags: [
      ["shahr", "شهر"],
      ["jadoo", "جادو"],
      ["kooh", "کوه"],
    ],
    chapters: [
      {
        title: "در سنگی",
        content: `
پارسا برای پیداکردن بز گمشده تا بالای کوه رفته بود.

هوا رو به تاریکی می‌رفت که شکافی میان سنگ‌ها دید.

پشت بوته‌های خشک، دری بزرگ از سنگ سیاه قرار داشت.

روی در نشانه‌ای شبیه خورشید حک شده بود.

پارسا دستش را روی نشانه گذاشت.

سنگ زیر انگشتانش گرم شد.

در بدون هیچ صدایی باز شد.

پشت آن، هزاران چراغ در عمق کوه می‌درخشید.
`,
      },
      {
        title: "مردم خاموش",
        content: `
شهری کامل زیر کوه ساخته شده بود.

خانه‌ها، بازارها و خیابان‌ها همه از سنگ سفید بودند.

اما هیچ صدایی شنیده نمی‌شد.

مردم شهر مانند مجسمه در جای خود ایستاده بودند.

زنی میان بازار تنها کسی بود که حرکت می‌کرد.

به پارسا نزدیک شد و گفت:

«تو از بیرون آمده‌ای. پس هنوز زمان در جهان شما جریان دارد.»

سپس ساعتی شکسته در دست او گذاشت.
`,
      },
      {
        title: "بیداری",
        content: `
زن گفت برای بیدارکردن شهر باید ساعت به بالاترین برج برده شود.

پارسا از پله‌های برج بالا رفت.

با هر قدم، صدای زمزمه مردم بیشتر می‌شد.

وقتی ساعت را در جای خالی بالای برج گذاشت، عقربه‌ها حرکت کردند.

شهر ناگهان پر از صدا شد.

مردم راه افتادند، کودکان خندیدند و زنگ‌ها به صدا درآمدند.

اما در سنگی پشت سر پارسا بسته شده بود.

اکنون او باید راه دیگری برای بازگشت پیدا می‌کرد.
`,
      },
    ],
  },

  {
    title: "نامه‌ای که نرسید",
    slug: "namei-ke-naresid",
    description:
      "نامه‌ای پس از بیست سال به مقصد می‌رسد و زنی را وادار می‌کند درباره تصمیمی که زندگی‌اش را تغییر داد، دوباره فکر کند.",
    genreSlug: "short-story",
    coverUrl: "/stories/story-4.jpg",
    status: "COMPLETED" as const,
    tags: [
      ["nameh", "نامه"],
      ["gozashteh", "گذشته"],
      ["khaterat", "خاطرات"],
    ],
    chapters: [
      {
        title: "پاکت آبی",
        content: `
نامه میان قبض‌ها و روزنامه‌های صبح بود.

پاکتی آبی با تمبری قدیمی.

نام نگار روی آن نوشته شده بود، اما نشانی متعلق به خانه‌ای بود که بیست سال پیش فروخته بودند.

گوشه پاکت تاریخ خورده بود.

بیست سال پیش.

نگار نامه را روی میز گذاشت.

خط فرستنده را شناخته بود.

برای بازکردنش به چند دقیقه سکوت نیاز داشت.
`,
      },
      {
        title: "بیست سال تأخیر",
        content: `
نامه کوتاه بود.

«من فردا در ایستگاه منتظرت می‌مانم. اگر نیایی، می‌فهمم که باید بروم.»

نگار آن روز را به یاد داشت.

به ایستگاه نرفته بود، چون فکر می‌کرد هیچ نامه‌ای برایش نوشته نشده است.

سال‌ها باور کرده بود که او بدون خداحافظی رفته.

حالا می‌دانست حقیقت چیز دیگری بوده است.

پایین نامه نشانی کوچکی نوشته شده بود.

نشانی یک کتاب‌فروشی.
`,
      },
      {
        title: "کتاب‌فروشی",
        content: `
زنگ کوچک بالای در کتاب‌فروشی صدا داد.

مردی پشت پیشخوان مشغول مرتب‌کردن کتاب‌ها بود.

سرش را بلند کرد.

هر دو برای مدتی طولانی به یکدیگر نگاه کردند.

نگار پاکت آبی را روی پیشخوان گذاشت.

مرد لبخند تلخی زد.

گفت: «بالاخره رسید.»

نگار پاسخ داد: «دیر رسید، اما شاید هنوز برای شنیدن جواب دیر نشده باشد.»
`,
      },
    ],
  },

  {
    title: "قطار ساعت پنج",
    slug: "ghatare-saate-panj",
    description:
      "کارمندی هر روز سوار قطار ساعت پنج می‌شود، تا اینکه متوجه می‌شود یکی از مسافران فقط در روزهای وقوع حادثه ظاهر می‌شود.",
    genreSlug: "thriller",
    coverUrl: "/stories/story-5.jpg",
    status: "ONGOING" as const,
    tags: [
      ["ghatar", "قطار"],
      ["hadeseh", "حادثه"],
      ["razalood", "رازآلود"],
    ],
    chapters: [
      {
        title: "مسافر صندلی دوازده",
        content: `
سامان هر روز روی صندلی یازده می‌نشست.

مرد ناشناس همیشه روی صندلی دوازده بود.

کت خاکستری می‌پوشید و روزنامه‌ای بدون تاریخ می‌خواند.

سامان ابتدا توجهی نکرد.

اما پس از حادثه هفته قبل فهمید مرد فقط همان روز در قطار بوده است.

امروز دوباره آنجا نشسته بود.

سامان به روزنامه نگاه کرد.

تیتر صفحه اول درباره خروج قطار از ریل بود.
`,
      },
      {
        title: "روزنامه فردا",
        content: `
سامان از مرد پرسید روزنامه برای چه روزی است.

مرد بدون اینکه سرش را بلند کند گفت: «فردا.»

روی صفحه، تصویری از همین قطار دیده می‌شد.

سامان شماره قطار را خواند.

همان شماره بود.

زمان حادثه پنج و چهل دقیقه نوشته شده بود.

ساعت مچی او پنج و سی‌ودو دقیقه را نشان می‌داد.

سامان از جایش بلند شد و به‌سمت ترمز اضطراری دوید.
`,
      },
      {
        title: "هشت دقیقه",
        content: `
مسافران با تعجب به سامان نگاه می‌کردند.

مأمور قطار تلاش کرد جلویش را بگیرد.

مرد کت‌خاکستری هنوز آرام نشسته بود.

سامان دستگیره ترمز را کشید.

قطار با صدایی بلند متوقف شد.

چند متر جلوتر، بخشی از ریل فرو ریخته بود.

وقتی سامان به صندلی دوازده برگشت، مرد ناپدید شده بود.

روزنامه روی صندلی مانده بود.

تیتر صفحه اول حالا تغییر کرده بود.
`,
      },
    ],
  },

  {
    title: "باغ خاموش",
    slug: "baghe-khamoosh",
    description:
      "در سال‌های پایانی قاجار، دختری جوان در باغ خانوادگی خود دفترچه‌ای پیدا می‌کند که از سرنوشت زنی فراموش‌شده سخن می‌گوید.",
    genreSlug: "historical-fiction",
    coverUrl: "/stories/story-6.jpg",
    status: "COMPLETED" as const,
    tags: [
      ["tarikhi", "تاریخی"],
      ["bagh", "باغ"],
      ["khanevadeh", "خانواده"],
    ],
    chapters: [
      {
        title: "اتاق بسته",
        content: `
سال‌ها بود که در اتاق انتهای باغ باز نشده بود.

مادربزرگ می‌گفت کلید آن گم شده است.

یک عصر پاییزی، مهتاب کلید کوچکی را زیر درخت انار پیدا کرد.

کلید دقیقاً در قفل اتاق جا گرفت.

داخل اتاق، همه‌چیز با پارچه‌های سفید پوشانده شده بود.

روی میز، دفترچه‌ای چرمی قرار داشت.

صفحه اول با این جمله آغاز می‌شد:

«نام من را از این خانه پاک کردند.»
`,
      },
      {
        title: "نام فراموش‌شده",
        content: `
دفترچه متعلق به زنی به نام خورشید بود.

او سال‌ها پیش در همین باغ زندگی می‌کرد.

در نوشته‌ها آمده بود که خورشید مدرسه‌ای پنهانی برای دختران روستا ساخته بود.

پس از مدتی مدرسه بسته و نام او از اسناد خانواده حذف شده بود.

مهتاب از مادربزرگ درباره خورشید پرسید.

رنگ از چهره پیرزن رفت.

گفت: «او خواهر من بود.»
`,
      },
      {
        title: "درخت انار",
        content: `
مادربزرگ مهتاب را تا قدیمی‌ترین درخت باغ برد.

پای درخت، جعبه‌ای فلزی دفن شده بود.

داخل آن نامه‌ها، کتاب‌ها و فهرست نام شاگردان خورشید قرار داشت.

مادربزرگ گفت تمام این سال‌ها منتظر کسی بوده که حقیقت را پیدا کند.

مهتاب دفترچه را بست.

چند ماه بعد، مدرسه‌ای کوچک کنار باغ افتتاح شد.

بالای در آن نوشته بودند:

«مدرسه خورشید.»
`,
      },
    ],
  },

  {
    title: "جزیره‌ای میان مه",
    slug: "jazirei-miyane-meh",
    description:
      "گروهی دریانورد به جزیره‌ای می‌رسند که روی هیچ نقشه‌ای نیست و ساکنانش معتقدند جهان بیرون قرن‌ها پیش نابود شده است.",
    genreSlug: "adventure",
    coverUrl: "/stories/story-7.jpg",
    status: "ONGOING" as const,
    tags: [
      ["jazireh", "جزیره"],
      ["safar", "سفر"],
      ["majarajooei", "ماجراجویی"],
    ],
    chapters: [
      {
        title: "چهارمین روز",
        content: `
چهار روز بود که کشتی در مه حرکت می‌کرد.

قطب‌نما از کار افتاده بود و ستاره‌ای دیده نمی‌شد.

صبح روز چهارم، صدای پرندگان از دور شنیده شد.

کمی بعد ساحلی سبز از میان مه بیرون آمد.

ناخدا نقشه را چند بار بررسی کرد.

در آن نقطه نباید هیچ جزیره‌ای وجود می‌داشت.

بااین‌حال، روی ساحل مردمی ایستاده بودند و برای آن‌ها مشعل تکان می‌دادند.
`,
      },
      {
        title: "روستای سنگی",
        content: `
خانه‌های جزیره از سنگ‌های سیاه ساخته شده بودند.

بزرگ روستا از دریانوردان پرسید از کدام پناهگاه آمده‌اند.

ناخدا گفت آن‌ها از شهر بندری حرکت کرده‌اند.

پیرمرد با ناباوری نگاهش کرد.

گفت: «شهرهای بیرون دویست سال پیش نابود شدند.»

سپس کتابی قدیمی آورد.

در کتاب نقشه‌ای بود که همه قاره‌ها را زیر آب نشان می‌داد.
`,
      },
      {
        title: "پشت مه",
        content: `
دریانوردان تصمیم گرفتند پیش از غروب جزیره را ترک کنند.

پیرمرد هشدار داد هیچ کشتی‌ای نمی‌تواند از مه عبور کند.

کشتی به‌سمت دریا حرکت کرد.

پس از چند ساعت دوباره همان ساحل مقابلشان ظاهر شد.

آن‌ها مسیر دیگری را امتحان کردند.

باز هم به جزیره بازگشتند.

ناخدا فهمید مه فقط جزیره را پنهان نمی‌کند.

مه اجازه نمی‌دهد کسی که وارد شده، دوباره خارج شود.
`,
      },
    ],
  },

  {
    title: "خانه شماره هفت",
    slug: "khane-shomare-haft",
    description:
      "در کوچه‌ای قدیمی، خانه شماره هفت هر شب یک پنجره بیشتر از شب قبل دارد و کسی نمی‌داند پشت پنجره تازه چه چیزی منتظر است.",
    genreSlug: "horror",
    coverUrl: "/stories/story-1.jpg",
    status: "ONGOING" as const,
    tags: [
      ["khaneh", "خانه"],
      ["tars", "ترس"],
      ["shab", "شب"],
    ],
    chapters: [
      {
        title: "پنجره چهارم",
        content: `
خانه شماره هفت همیشه سه پنجره داشت.

آوا از کودکی هر روز از مقابل آن عبور می‌کرد.

یک شب متوجه پنجره چهارمی در طبقه بالا شد.

چراغی کم‌نور پشت آن روشن بود.

زنی پشت شیشه ایستاده بود و به کوچه نگاه می‌کرد.

آوا چند لحظه بعد دوباره به پنجره نگاه کرد.

زن حالا مستقیم به او خیره شده بود.

صبح روز بعد، پنجره چهارم ناپدید شده بود.
`,
      },
      {
        title: "پنجره پنجم",
        content: `
شب بعد پنجره چهارم برگشت.

این بار پنجره پنجمی نیز کنار آن بود.

پشت پنجره پنجم، اتاق خود آوا دیده می‌شد.

تخت، میز و حتی لباس‌هایی که روی صندلی انداخته بود، همان‌جا بودند.

بعد خودش وارد اتاق شد.

نسخه دیگری از آوا پشت پنجره ایستاد و دستش را روی شیشه گذاشت.

لب‌هایش تکان خورد.

گفت: «در را باز نکن.»
`,
      },
      {
        title: "در باز",
        content: `
صدای زنگ خانه نیمه‌شب بلند شد.

آوا از پنجره اتاقش به کوچه نگاه کرد.

خانه شماره هفت دیگر آن‌سوی کوچه نبود.

به‌جای آن، فقط زمینی خالی دیده می‌شد.

زنگ دوباره صدا داد.

آوا به‌آرامی به در نزدیک شد.

از پشت در صدای خودش را شنید.

«من از خانه شماره هفت فرار کردم.»

دستگیره در شروع به چرخیدن کرد.
`,
      },
    ],
  },

  {
    title: "تابستانی که تمام نشد",
    slug: "tabestani-ke-tamam-nashod",
    description:
      "چهار دوست تصمیم می‌گیرند آخرین تابستان پیش از دانشگاه را ثبت کنند، اما رازی قدیمی دوستی آن‌ها را تغییر می‌دهد.",
    genreSlug: "young-adult",
    coverUrl: "/stories/story-2.jpg",
    status: "COMPLETED" as const,
    tags: [
      ["tabestan", "تابستان"],
      ["doosti", "دوستی"],
      ["nojavaan", "نوجوان"],
    ],
    chapters: [
      {
        title: "فهرست تابستان",
        content: `
قرار بود آخرین تابستانشان متفاوت باشد.

ستاره، نیلوفر، امیر و نوید فهرستی از کارهایی نوشتند که باید پیش از دانشگاه انجام می‌دادند.

تماشای طلوع از بالای تپه.

شنا در دریاچه.

سفر بدون برنامه.

و پیداکردن جعبه‌ای که ده سال پیش کنار مدرسه دفن کرده بودند.

هیچ‌کدام به یاد نداشت داخل جعبه چه گذاشته‌اند.

جز نوید که از همان ابتدا نمی‌خواست آن را پیدا کنند.
`,
      },
      {
        title: "جعبه فلزی",
        content: `
جعبه هنوز زیر درخت قدیمی بود.

داخل آن چهار نامه قرار داشت؛ هرکدام خطاب به نسخه آینده خودشان.

اما نامه پنجمی هم آنجا بود.

نامه به نام پسری نوشته شده بود که سال‌ها پیش از محله رفته بود.

در نامه اعترافی درباره حادثه‌ای در دریاچه وجود داشت.

ستاره نوشته را خواند و به دوستانش نگاه کرد.

حالا می‌فهمید چرا نوید تمام این سال‌ها از دریاچه دوری کرده بود.
`,
      },
      {
        title: "آخرین روز",
        content: `
چهار دوست تا غروب کنار دریاچه نشستند.

برای نخستین بار درباره آن روز حرف زدند.

درباره ترس، سکوت و دروغی که سال‌ها همراهشان مانده بود.

نوید نامه را در آب نینداخت.

آن را نگه داشت تا به صاحبش برساند.

تابستان تمام شد و هرکدام به شهری رفتند.

اما چیزی میان آن‌ها تغییر کرده بود.

دوستی‌شان دیگر بر یک راز بنا نشده بود.
`,
      },
    ],
  },

  {
    title: "مردی که خواب‌ها را می‌فروخت",
    slug: "mardi-ke-khabha-ra-miforookht",
    description:
      "در بازار شبانه، پیرمردی خواب‌های شیشه‌ای می‌فروشد. خرید یکی از آن‌ها زندگی دختری بی‌خواب را برای همیشه تغییر می‌دهد.",
    genreSlug: "fantasy",
    coverUrl: "/stories/story-3.jpg",
    status: "ONGOING" as const,
    tags: [
      ["khab", "خواب"],
      ["bazaar", "بازار"],
      ["khial", "خیال"],
    ],
    chapters: [
      {
        title: "بازار شبانه",
        content: `
بازار فقط پس از نیمه‌شب ظاهر می‌شد.

یاسمن سه شب پیاپی به همان کوچه رفت تا بالاخره آن را پیدا کرد.

دکان‌ها زیر نور فانوس‌های نارنجی می‌درخشیدند.

در انتهای بازار، پیرمردی شیشه‌های کوچکی روی میز چیده بود.

داخل هر شیشه نوری رنگی حرکت می‌کرد.

پیرمرد گفت: «خواب شیرین، خواب شجاعانه یا خوابی که حقیقت را نشان می‌دهد؟»

یاسمن شیشه آبی را انتخاب کرد.
`,
      },
      {
        title: "خواب آبی",
        content: `
آن شب یاسمن برای نخستین بار پس از ماه‌ها خوابید.

در خواب، خودش را در خانه‌ای کنار دریا دید.

زنی روی ایوان منتظرش بود.

وقتی نزدیک شد، فهمید زن نسخه پیرتر خودش است.

زن گفت: «این آینده تو نیست. این آینده‌ای است که از آن فرار می‌کنی.»

سپس کلیدی به یاسمن داد.

صبح که بیدار شد، کلید واقعاً در دستش بود.
`,
      },
      {
        title: "دکان بسته",
        content: `
یاسمن شب بعد به بازار برگشت.

دکان پیرمرد بسته بود.

روی میز فقط یادداشتی قرار داشت.

«هر خواب دری دارد و هر در بهایی.»

کلید، در خانه‌ای متروکه در انتهای شهر را باز کرد.

داخل خانه صدها شیشه آبی روی قفسه‌ها بود.

در هر شیشه، نسخه‌ای از خواب همان شب تکرار می‌شد.

یاسمن صدای پیرمرد را از طبقه بالا شنید.

«حالا باید انتخاب کنی کدام آینده را بیدار کنی.»
`,
      },
    ],
  },
] as const;

/*
 * زبان هر مجموعه هنگام ترکیب به‌صورت صریح اضافه می‌شود.
 */

const stories = [
  ...englishStories.map((story) => ({
    ...story,
    language: "en" as const,
  })),

  ...persianStories.map((story) => ({
    ...story,
    language: "fa" as const,
  })),
] as const;

/* --------------------------------------------------
 * Helpers
 * -------------------------------------------------- */

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function contentHash(title: string, content: string): string {
  return createHash("sha256")
    .update(title)
    .update("\0")
    .update(content)
    .digest("hex");
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
  const developmentPasswordHash = await hash("Development1!", {
    type: 2,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
    salt: Buffer.alloc(16, 7),
  });

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
        passwordHash: developmentPasswordHash,
        status: "ACTIVE",
        role: "USER",
      },
      create: {
        email: author.email,
        username: author.username,
        usernameNormalized: author.username.toLowerCase(),
        passwordHash: developmentPasswordHash,
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
    await prisma.userPreference.upsert({
      where: { userId: user.id },
      create: { userId: user.id, allowMatureContent: false },
      update: {},
    });
    await prisma.userStats.upsert({
      where: { userId: user.id },
      create: { userId: user.id },
      update: {},
    });
  }

  console.log(`✓ ${authors.length} fake authors seeded.`);

  /*
   * --------------------------------------------------
   * 3. Stories
   * --------------------------------------------------
   */

  const storyIds: string[] = [];
  const chapterIds: string[] = [];

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
        language: storyData.language,
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
        language: storyData.language,
        status: storyData.status,
        visibility: "PUBLIC",
        rights: "ALL_RIGHTS_RESERVED",
        moderationState: "VISIBLE",
        isMature: false,
        publishedAt: new Date(),
      },
    });
    storyIds.push(story.id);
    await prisma.storyStats.upsert({
      where: { storyId: story.id },
      create: { storyId: story.id },
      update: {},
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

      const chapterContent = chapterData.content.trim();
      const existingChapter = await prisma.chapter.findUnique({
        where: {
          storyId_position: {
            storyId: story.id,
            position,
          },
        },
        select: { id: true },
      });
      const chapter = existingChapter
        ? await prisma.chapter.update({
            where: { id: existingChapter.id },
            data: {
              title: chapterData.title,
              content: chapterContent,
              contentHash: contentHash(chapterData.title, chapterContent),
              version: 1,
              status: "PUBLISHED",
              moderationState: "VISIBLE",
              wordCount: countWords(chapterData.content),
              publishedAt: new Date(),
            },
          })
        : await prisma.chapter.create({
            data: {
              storyId: story.id,
              title: chapterData.title,
              position,
              content: chapterContent,
              contentHash: contentHash(chapterData.title, chapterContent),
              version: 1,
              status: "PUBLISHED",
              moderationState: "VISIBLE",
              wordCount: countWords(chapterData.content),
              publishedAt: new Date(),
            },
          });
      chapterIds.push(chapter.id);
      await prisma.chapterRevision.upsert({
        where: {
          chapterId_revisionNumber: {
            chapterId: chapter.id,
            revisionNumber: 1,
          },
        },
        create: {
          chapterId: chapter.id,
          createdBy: authorId,
          revisionNumber: 1,
          sourceVersion: chapter.version,
          title: chapter.title,
          content: chapterContent,
          contentHash: contentHash(chapter.title, chapterContent),
          wordCount: chapter.wordCount,
          reason: "PUBLISH",
          protected: true,
        },
        update: {},
      });
    }

    console.log(
      `  ✓ Story ${storyIndex + 1}/${stories.length}: ${storyData.title}`,
    );
  }

  console.log(`✓ ${stories.length} stories seeded.`);
  console.log(`✓ ${chapterIds.length} chapters seeded.`);
  console.log("✓ Story tags connected.");
  const firstAuthorId = authorIds.at(0);
  const secondAuthorId = authorIds.at(1);
  const firstStoryId = storyIds.at(0);
  const secondStoryId = storyIds.at(1);
  const firstChapterId = chapterIds.at(0);
  if (
    !firstAuthorId ||
    !secondAuthorId ||
    !firstStoryId ||
    !secondStoryId ||
    !firstChapterId
  ) {
    throw new Error("Expected deterministic seed fixtures were not created.");
  }

  await prisma.follow.createMany({
    data: [
      { followerId: firstAuthorId, followingId: secondAuthorId },
      { followerId: secondAuthorId, followingId: firstAuthorId },
    ],
    skipDuplicates: true,
  });
  await prisma.libraryEntry.createMany({
    data: [
      { userId: firstAuthorId, storyId: secondStoryId },
      { userId: secondAuthorId, storyId: firstStoryId },
    ],
    skipDuplicates: true,
  });
  const list = await prisma.readingList.upsert({
    where: {
      userId_name: { userId: firstAuthorId, name: "Development favorites" },
    },
    create: {
      userId: firstAuthorId,
      name: "Development favorites",
      description: "Deterministic fake reading list for local development.",
      isPublic: true,
    },
    update: {
      description: "Deterministic fake reading list for local development.",
    },
  });
  await prisma.readingListItem.upsert({
    where: {
      readingListId_storyId: { readingListId: list.id, storyId: secondStoryId },
    },
    create: { readingListId: list.id, storyId: secondStoryId, position: 1 },
    update: { position: 1 },
  });
  await prisma.readingProgress.upsert({
    where: {
      userId_storyId: { userId: firstAuthorId, storyId: secondStoryId },
    },
    create: {
      userId: firstAuthorId,
      storyId: secondStoryId,
      chapterId: chapterIds.at(3),
      progress: 0.35,
      anchor: "paragraph:3",
    },
    update: { progress: 0.35, anchor: "paragraph:3" },
  });
  const visitorKey = createHash("sha256")
    .update(`user:${firstAuthorId}`)
    .digest("hex");
  const signalBucket = new Date("2026-08-13T00:00:00.000Z");
  await prisma.readingHistory.deleteMany({
    where: {
      userId: firstAuthorId,
      storyId: firstStoryId,
      occurredAt: signalBucket,
    },
  });
  await prisma.readingHistory.create({
    data: {
      userId: firstAuthorId,
      storyId: firstStoryId,
      chapterId: firstChapterId,
      type: "STARTED",
      progress: 0.1,
      occurredAt: signalBucket,
    },
  });
  await prisma.readSignal.upsert({
    where: {
      visitorKey_chapterId_bucketStart: {
        visitorKey,
        chapterId: firstChapterId,
        bucketStart: signalBucket,
      },
    },
    create: {
      storyId: firstStoryId,
      chapterId: firstChapterId,
      userId: firstAuthorId,
      actorType: "AUTHENTICATED",
      visitorKey,
      bucketStart: signalBucket,
      qualifiedAt: signalBucket,
    },
    update: {},
  });
  const anonymousVisitorKey = createHash("sha256")
    .update("seed:anonymous-reader")
    .digest("hex");
  await prisma.readSignal.upsert({
    where: {
      visitorKey_chapterId_bucketStart: {
        visitorKey: anonymousVisitorKey,
        chapterId: firstChapterId,
        bucketStart: signalBucket,
      },
    },
    create: {
      storyId: firstStoryId,
      chapterId: firstChapterId,
      actorType: "ANONYMOUS",
      visitorKey: anonymousVisitorKey,
      bucketStart: signalBucket,
      qualifiedAt: signalBucket,
    },
    update: {},
  });
  await prisma.chapterVote.upsert({
    where: {
      userId_chapterId: { userId: secondAuthorId, chapterId: firstChapterId },
    },
    create: { userId: secondAuthorId, chapterId: firstChapterId },
    update: {},
  });
  const existingComment = await prisma.comment.findFirst({
    where: {
      userId: secondAuthorId,
      chapterId: firstChapterId,
      content: "A deterministic development comment.",
    },
    select: { id: true },
  });
  if (!existingComment) {
    await prisma.comment.create({
      data: {
        userId: secondAuthorId,
        chapterId: firstChapterId,
        content: "A deterministic development comment.",
      },
    });
  }
  await prisma.notification.upsert({
    where: { dedupeKey: "seed:development-follow" },
    create: {
      recipientId: firstAuthorId,
      actorId: secondAuthorId,
      dedupeKey: "seed:development-follow",
      type: "FOLLOW",
      data: { seeded: true },
    },
    update: {},
  });
  console.log("✓ Social, reading, revision, and notification fixtures seeded.");
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
