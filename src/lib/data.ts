// Reads processed debates from data/debates/*.json at build time.

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Debate } from "./debate";

const DEBATES_DIR = join(process.cwd(), "data", "debates");

/** All processed debates, newest meeting first. */
export async function getAllDebates(): Promise<Debate[]> {
  let files: string[];
  try {
    files = (await readdir(DEBATES_DIR)).filter((name) => name.endsWith(".json"));
  } catch {
    return [];
  }

  const debates = await Promise.all(
    files.map(
      async (name) =>
        JSON.parse(await readFile(join(DEBATES_DIR, name), "utf8")) as Debate,
    ),
  );
  return debates.sort((a, b) => b.date.localeCompare(a.date));
}

/** A single debate by its slug, or null if it does not exist. */
export async function getDebate(slug: string): Promise<Debate | null> {
  const debates = await getAllDebates();
  return debates.find((debate) => debate.slug === slug) ?? null;
}

/** Format an ISO date as a Dutch reading date, e.g. "12 maart 2026". */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}
