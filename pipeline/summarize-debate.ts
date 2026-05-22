// Step 2 of the pipeline: turn a raw debate transcript into a plain-language,
// strictly factual summary, then run an automated verification pass over it.
//
// Run: npx tsx pipeline/summarize-debate.ts [debateId]
// With no argument it processes every transcript in data/raw.

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { verslagSourceUrl } from "./lib/tweedekamer-api";
import type {
  Debate,
  DebateSummary,
  DebateTranscript,
  GlossaryEntry,
  VerificationResult,
} from "../src/lib/debate";

const RAW_DIR = join(process.cwd(), "data", "raw");
const OUT_DIR = join(process.cwd(), "data", "debates");
const MODEL = "claude-opus-4-7";

const client = new Anthropic();

const SUMMARIZE_SYSTEM = `Je bent de redactie van "Politiek voor Iedereen", een website die plenaire debatten van de Tweede Kamer begrijpelijk maakt voor iedereen.

DOELGROEP: een breed publiek met weinig politieke voorkennis. Schrijf op taalniveau B1: korte zinnen, gewone woorden, geen onnodig jargon.

STRIKT FEITELIJK — dit is de belangrijkste regel:
- Geef alleen weer WAT er is gezegd en besloten.
- Geen oordeel, geen "dit is goed of slecht", geen inschatting van gevolgen, geen duiding van wat een besluit "betekent".
- Standpunten van partijen weergeven mag wel — feitelijk en toegeschreven ("D66 zei dat ...", "Volgens de VVD ..."). Geef geen eigen mening over die standpunten.
- Een moeilijke term uitleggen is GEEN duiding maar woordenschat — dat mag en moet juist.
- Baseer je uitsluitend op het verslag dat je krijgt. Verzin niets. Staat iets niet in het verslag, neem het dan niet op.

Vul het vaste sjabloon:
- "what": 2 tot 4 zinnen — waar ging het debat over en waarom stond het op de agenda (alleen als dat feitelijk uit het verslag blijkt).
- "keyPoints": de belangrijkste besproken punten, elk als één korte zin.
- "partyPositions": per fractie die het woord voerde kort en feitelijk hun ingebrachte standpunt.
- "decisions": wat er is besloten — aangenomen of verworpen moties, stemuitslagen, toezeggingen — voor zover dat in het verslag staat. Lege lijst als er niets is besloten.
- "glossary": de politieke of procedurele termen uit DIT debat die een leek niet kent (zoals "motie", "tweeminutendebat", "amendement"). Leg elke term in 1 of 2 eenvoudige zinnen uit. Alleen termen die echt in het verslag voorkomen.`;

const VERIFY_SYSTEM = `Je bent de kwaliteitscontrole van "Politiek voor Iedereen". Je krijgt het officiële verslag van een Kamerdebat én een automatisch gemaakte samenvatting daarvan. Controleer de samenvatting op twee punten:

1. FEITELIJKE DEKKING: staat elke bewering in de samenvatting echt in het verslag? Markeer elke bewering die niet door het verslag wordt gesteund of die het verslag tegenspreekt.
2. NEUTRALITEIT: is de toon strikt feitelijk? Markeer elk waarderend woord, elk oordeel en elke duiding (een inschatting van gevolgen of betekenis die niet letterlijk in het verslag staat). Het uitleggen van een term is toegestaan en is geen probleem.

Geef "status": "ok" als je geen problemen vindt, of "flagged" als er één of meer problemen zijn. Zet elk probleem concreet in "issues" (welke zin, wat er mis is). Lege lijst als alles in orde is.`;

const summarySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: {
      type: "object",
      additionalProperties: false,
      properties: {
        what: { type: "string" },
        keyPoints: { type: "array", items: { type: "string" } },
        partyPositions: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              party: { type: "string" },
              position: { type: "string" },
            },
            required: ["party", "position"],
          },
        },
        decisions: { type: "array", items: { type: "string" } },
      },
      required: ["what", "keyPoints", "partyPositions", "decisions"],
    },
    glossary: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          term: { type: "string" },
          explanation: { type: "string" },
        },
        required: ["term", "explanation"],
      },
    },
  },
  required: ["summary", "glossary"],
};

const verifySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    status: { type: "string", enum: ["ok", "flagged"] },
    issues: { type: "array", items: { type: "string" } },
  },
  required: ["status", "issues"],
};

function transcriptText(transcript: DebateTranscript): string {
  return transcript.segments
    .map((segment) => {
      const who = [segment.party, segment.speaker].filter(Boolean).join(" - ");
      return `[${who || "Onbekend"}]\n${segment.text}`;
    })
    .join("\n\n");
}

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function textOf(response: Anthropic.Message): string {
  const block = response.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("No text block in model response");
  }
  return block.text;
}

async function summarize(
  transcript: DebateTranscript,
): Promise<{ summary: DebateSummary; glossary: GlossaryEntry[] }> {
  const userMessage = [
    `Debat: ${transcript.title}`,
    `Vergadering: ${transcript.meetingTitle}`,
    "",
    "Hieronder het officiële verslag van dit debat. Vat het samen volgens de instructies.",
    "",
    "=== VERSLAG ===",
    transcriptText(transcript),
  ].join("\n");

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    system: [
      {
        type: "text",
        text: SUMMARIZE_SYSTEM,
        cache_control: { type: "ephemeral" },
      },
    ],
    output_config: { format: { type: "json_schema", schema: summarySchema } },
    messages: [{ role: "user", content: userMessage }],
  } as Anthropic.MessageCreateParamsNonStreaming);

  if (response.stop_reason === "refusal") {
    throw new Error("Model refused to summarize the debate");
  }
  return JSON.parse(textOf(response));
}

async function verify(
  transcript: DebateTranscript,
  summary: DebateSummary,
  glossary: GlossaryEntry[],
): Promise<VerificationResult> {
  const userMessage = [
    "=== VERSLAG ===",
    transcriptText(transcript),
    "",
    "=== SAMENVATTING OM TE CONTROLEREN ===",
    JSON.stringify({ summary, glossary }, null, 2),
  ].join("\n");

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    system: [
      {
        type: "text",
        text: VERIFY_SYSTEM,
        cache_control: { type: "ephemeral" },
      },
    ],
    output_config: { format: { type: "json_schema", schema: verifySchema } },
    messages: [{ role: "user", content: userMessage }],
  } as Anthropic.MessageCreateParamsNonStreaming);

  if (response.stop_reason === "refusal") {
    throw new Error("Model refused to verify the summary");
  }
  const result = JSON.parse(textOf(response)) as {
    status: "ok" | "flagged";
    issues: string[];
  };
  return { ...result, checkedAt: new Date().toISOString() };
}

async function processDebate(transcript: DebateTranscript): Promise<Debate> {
  console.log(`  summarizing "${transcript.title}" ...`);
  const { summary, glossary } = await summarize(transcript);

  console.log(`  verifying ...`);
  const verification = await verify(transcript, summary, glossary);

  return {
    id: transcript.debateId,
    slug: slugify(transcript.title) || transcript.debateId,
    title: transcript.title,
    date: transcript.date,
    meetingTitle: transcript.meetingTitle,
    kind: transcript.kind,
    summary,
    glossary,
    verification,
    sources: { verslag: verslagSourceUrl(transcript.verslagId) },
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const onlyId = process.argv[2];
  const files = (await readdir(RAW_DIR)).filter((f) => f.endsWith(".json"));
  await mkdir(OUT_DIR, { recursive: true });

  for (const file of files) {
    const transcript = JSON.parse(
      await readFile(join(RAW_DIR, file), "utf8"),
    ) as DebateTranscript;
    if (onlyId && transcript.debateId !== onlyId) continue;

    const debate = await processDebate(transcript);
    const outFile = join(OUT_DIR, `${debate.slug}.json`);
    await writeFile(outFile, JSON.stringify(debate, null, 2));
    console.log(
      `  saved ${debate.slug}.json — verification: ${debate.verification.status}`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
