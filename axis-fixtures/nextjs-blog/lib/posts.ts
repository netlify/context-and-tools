export type Post = {
  slug: string;
  title: string;
  publishedAt: string;
  excerpt: string;
  body: string;
};

const posts: Post[] = [
  {
    slug: "hello-world",
    title: "Hello, world",
    publishedAt: "2026-04-01",
    excerpt: "Why I started this blog.",
    body: "Welcome to Daybook. This is the first post — a quick note on why this blog exists and what to expect.",
  },
  {
    slug: "shipping-small",
    title: "On shipping small",
    publishedAt: "2026-04-15",
    excerpt: "The case for releasing in tiny increments.",
    body: "There's a quiet superpower in shipping small. Each tiny release teaches you something the next one can use.",
  },
  {
    slug: "writing-rubrics",
    title: "Writing good rubrics",
    publishedAt: "2026-05-01",
    excerpt: "Evaluating model output without overfitting to one solution.",
    body: "Good rubrics describe outcomes, not implementations. They leave room for multiple correct answers.",
  },
];

export function getAllPosts(): Post[] {
  return posts.slice().sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export function getPost(slug: string): Post | undefined {
  return posts.find((p) => p.slug === slug);
}
