// Step 1 of the pipeline: fetch the most recent final plenary verslag,
// extract every plenary debate from it, and save each as a raw transcript.
//
// Run: npx tsx pipeline/fetch-debate.ts

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  fetchVerslagXml,
  getRecentFinalVerslagen,
} from "./lib/tweedekamer-api";
import { parseVerslag } from "./lib/verslag-parser";
import type { DebateTranscript } from "../src/lib/debate";

const RAW_DIR = join(process.cwd(), "data", "raw");

async function main() {
  const verslagen = await getRecentFinalVerslagen(3);
  if (verslagen.length === 0) {
    throw new Error("No final plenary verslagen found");
  }

  const verslag = verslagen[0];
  console.log(`Verslag: ${verslag.meetingTitle} (${verslag.meetingDate})`);

  const xml = await fetchVerslagXml(verslag.id);
  const parsed = parseVerslag(xml);

  const debates = parsed.debates.filter(
    (debate) => debate.kind === "Plenair debat" && debate.segments.length > 0,
  );
  console.log(`Found ${debates.length} plenary debate(s).`);

  await mkdir(RAW_DIR, { recursive: true });

  for (const debate of debates) {
    const transcript: DebateTranscript = {
      debateId: debate.debateId,
      meetingId: parsed.meetingId,
      verslagId: verslag.id,
      title: debate.onderwerp || debate.title,
      date: parsed.meetingDate,
      meetingTitle: parsed.meetingTitle,
      kind: debate.kind,
      segments: debate.segments,
    };
    const file = join(RAW_DIR, `${debate.debateId}.json`);
    await writeFile(file, JSON.stringify(transcript, null, 2));

    const chars = debate.segments.reduce((n, s) => n + s.text.length, 0);
    console.log(
      `  saved "${transcript.title}" — ${debate.segments.length} segments, ${chars} chars`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
