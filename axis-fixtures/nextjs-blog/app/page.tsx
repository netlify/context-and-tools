import Link from "next/link";
import { getAllPosts } from "@/lib/posts";

export default function HomePage() {
  const posts = getAllPosts();
  return (
    <section>
      <h1>Latest posts</h1>
      <ul className="post-list">
        {posts.map((post) => (
          <li key={post.slug}>
            <Link href={`/posts/${post.slug}`}>{post.title}</Link>
            <time dateTime={post.publishedAt}>{post.publishedAt}</time>
            <p>{post.excerpt}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
