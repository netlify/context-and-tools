import type { Config } from "@netlify/functions";
import { getProducts } from "../../lib/db";

export default async () => {
  const products = await getProducts();
  return Response.json(products);
};

export const config: Config = { path: "/api/products" };
