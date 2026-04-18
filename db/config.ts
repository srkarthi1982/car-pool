import { defineDb } from "astro:db";
import { carPoolTables } from "./tables";

export default defineDb({
  tables: carPoolTables,
});
