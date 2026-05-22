// Shared data model for "Politiek voor Iedereen".
// A "debate" is one plenary debate: one <activiteit soort="Plenair debat">
// inside the official verslag (Handelingen) of a plenary meeting.

/** A single speaker turn in the raw debate transcript. */
export interface TranscriptSegment {
  speaker: string;
  party: string;
  role: string;
  text: string;
}

/** Raw transcript of one plenary debate, extracted from the official verslag XML. */
export interface DebateTranscript {
  debateId: string;
  meetingId: string;
  verslagId: string;
  title: string;
  date: string;
  meetingTitle: string;
  kind: string;
  segments: TranscriptSegment[];
}

/** Where a party stood in the debate — factually reported, no judgement. */
export interface PartyPosition {
  party: string;
  position: string;
}

/** A jargon term used in the debate, explained in plain language. */
export interface GlossaryEntry {
  term: string;
  explanation: string;
}

/** The plain-language, strictly factual summary of a debate (AI-generated). */
export interface DebateSummary {
  /** "Waar ging het over?" */
  what: string;
  /** "De belangrijkste punten" */
  keyPoints: string[];
  /** "Wat vonden de partijen?" */
  partyPositions: PartyPosition[];
  /** "Wat is er besloten?" */
  decisions: string[];
}

/** Result of the automated verification pass over the AI summary. */
export interface VerificationResult {
  status: "ok" | "flagged";
  checkedAt: string;
  issues: string[];
}

/** A fully processed debate, ready to be rendered on the website. */
export interface Debate {
  id: string;
  slug: string;
  title: string;
  /** ISO date of the plenary meeting. */
  date: string;
  meetingTitle: string;
  /** Activity kind from the verslag, e.g. "Plenair debat". */
  kind: string;
  summary: DebateSummary;
  glossary: GlossaryEntry[];
  verification: VerificationResult;
  sources: {
    /** Link to the official verslag (Handelingen). */
    verslag: string;
    /** Link to the debate page / video on tweedekamer.nl. */
    debat?: string;
  };
  generatedAt: string;
}
