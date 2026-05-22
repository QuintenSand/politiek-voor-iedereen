// Parser for the Tweede Kamer "vlosCoreDocument" verslag XML.
// Structure: vlosCoreDocument > vergadering > activiteit* ; each activiteit is
// one topic. Spoken text lives in nested <woordvoerder> elements, each holding
// a <spreker> (with <fractie>, <verslagnaam>, <functie>) and a <tekst> block.

import { XMLParser } from "fast-xml-parser";
import type { TranscriptSegment } from "../../src/lib/debate";

// In preserveOrder mode every node is an object with a single tag key whose
// value is the ordered child array; attributes sit under ":@"; text nodes
// carry a "#text" key.
type PNode = Record<string, unknown>;

const parser = new XMLParser({
  preserveOrder: true,
  ignoreAttributes: false,
  attributeNamePrefix: "",
  parseTagValue: false,
  trimValues: true,
});

function tagName(node: PNode): string | null {
  for (const key of Object.keys(node)) {
    if (key !== ":@" && key !== "#text") return key;
  }
  return null;
}

function childrenOf(node: PNode): PNode[] {
  const tag = tagName(node);
  const value = tag ? node[tag] : null;
  return Array.isArray(value) ? (value as PNode[]) : [];
}

function attrsOf(node: PNode): Record<string, string> {
  return (node[":@"] as Record<string, string>) ?? {};
}

/** All descendant nodes with the given tag, in document order. */
function findAll(nodes: PNode[], tag: string): PNode[] {
  const out: PNode[] = [];
  for (const node of nodes) {
    if (tagName(node) === tag) out.push(node);
    out.push(...findAll(childrenOf(node), tag));
  }
  return out;
}

/** First direct child element with the given tag. */
function firstChild(node: PNode, tag: string): PNode | undefined {
  return childrenOf(node).find((child) => tagName(child) === tag);
}

/** Concatenated text of all #text descendants of the given nodes. */
function textOf(nodes: PNode[]): string {
  let out = "";
  for (const node of nodes) {
    if ("#text" in node) {
      out += String(node["#text"]);
    } else {
      out += " " + textOf(childrenOf(node));
    }
  }
  return out;
}

/** Trimmed text content of the first child element with the given tag. */
function childText(node: PNode, tag: string): string {
  const child = firstChild(node, tag);
  return child ? textOf(childrenOf(child)).replace(/\s+/g, " ").trim() : "";
}

export interface ParsedDebate {
  debateId: string;
  title: string;
  onderwerp: string;
  kind: string;
  segments: TranscriptSegment[];
}

export interface ParsedVerslag {
  meetingId: string;
  meetingTitle: string;
  meetingDate: string;
  debates: ParsedDebate[];
}

function parseActiviteit(activiteit: PNode): ParsedDebate {
  const attrs = attrsOf(activiteit);
  const segments: TranscriptSegment[] = [];

  for (const woordvoerder of findAll([activiteit], "woordvoerder")) {
    const tekst = firstChild(woordvoerder, "tekst");
    if (!tekst) continue;
    const text = textOf(childrenOf(tekst)).replace(/\s+/g, " ").trim();
    if (!text) continue;

    const spreker = firstChild(woordvoerder, "spreker");
    segments.push({
      speaker: spreker ? childText(spreker, "verslagnaam") : "",
      party: spreker ? childText(spreker, "fractie") : "",
      role: spreker ? childText(spreker, "functie") : "",
      text,
    });
  }

  return {
    debateId: attrs.objectid ?? "",
    title: childText(activiteit, "titel"),
    onderwerp: childText(activiteit, "onderwerp"),
    kind: attrs.soort ?? "",
    segments,
  };
}

export function parseVerslag(xml: string): ParsedVerslag {
  const root = parser.parse(xml.replace(/^﻿/, "")) as PNode[];
  const doc = findAll(root, "vlosCoreDocument")[0];
  if (!doc) throw new Error("No vlosCoreDocument found in verslag XML");

  const vergadering = firstChild(doc, "vergadering");
  if (!vergadering) throw new Error("No vergadering found in verslag XML");

  const debates = childrenOf(vergadering)
    .filter((node) => tagName(node) === "activiteit")
    .map(parseActiviteit);

  return {
    meetingId: attrsOf(vergadering).objectid ?? "",
    meetingTitle: childText(vergadering, "titel"),
    meetingDate: childText(vergadering, "datum"),
    debates,
  };
}
