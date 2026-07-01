import { neon } from "@netlify/neon";

// Legacy Netlify Neon extension: `neon()` auto-reads NETLIFY_DATABASE_URL from
// the environment — no connection string is passed in.
export const sql = neon();

export async function getProducts() {
  return sql`SELECT id, name, price FROM products ORDER BY name`;
}
