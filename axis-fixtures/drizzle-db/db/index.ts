import { drizzle } from "drizzle-orm/netlify-db";
import * as schema from "./schema";

// The netlify-db adapter picks up the connection automatically — no
// connection string is passed in.
export const db = drizzle({ schema });
