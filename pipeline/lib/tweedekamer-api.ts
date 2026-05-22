// Client for the Tweede Kamer Open Data API (OData v4).
// Docs: https://opendata.tweedekamer.nl/documentatie/odata-api

const BASE_URL = "https://gegevensmagazijn.tweedekamer.nl/OData/v4/2.0";

export interface VerslagMeta {
  id: string;
  soort: string;
  status: string;
  contentLength: number;
  meetingId: string;
  meetingTitle: string;
  meetingDate: string;
}

interface ODataResponse<T> {
  value: T[];
}

async function odata<T>(
  entity: string,
  params: Record<string, string>,
): Promise<T[]> {
  const url = new URL(`${BASE_URL}/${entity}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`OData ${entity} failed: ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as ODataResponse<T>;
  return json.value;
}

interface RawVerslag {
  Id: string;
  Soort: string;
  Status: string;
  ContentLength: number;
  Vergadering: {
    Id: string;
    Soort: string;
    Titel: string;
    Datum: string;
  } | null;
}

/**
 * Most recent final (corrected) verslagen of plenary meetings.
 * "Eindpublicatie" + "Gecorrigeerd" is the definitive transcript — preferred
 * over interim publications for accuracy.
 */
export async function getRecentFinalVerslagen(top = 5): Promise<VerslagMeta[]> {
  const rows = await odata<RawVerslag>("Verslag", {
    $filter:
      "Soort eq 'Eindpublicatie' and Status eq 'Gecorrigeerd' and Verwijderd eq false",
    $orderby: "GewijzigdOp desc",
    $top: String(top),
    $expand: "Vergadering",
  });
  return rows
    .filter((r) => r.Vergadering?.Soort === "Plenair")
    .map((r) => ({
      id: r.Id,
      soort: r.Soort,
      status: r.Status,
      contentLength: r.ContentLength,
      meetingId: r.Vergadering!.Id,
      meetingTitle: r.Vergadering!.Titel,
      meetingDate: r.Vergadering!.Datum,
    }));
}

/** Fetch the raw verslag XML (a vlosCoreDocument). */
export async function fetchVerslagXml(verslagId: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/Verslag(${verslagId})/resource`);
  if (!res.ok) {
    throw new Error(`Verslag resource ${verslagId} failed: ${res.status}`);
  }
  return res.text();
}

/** Public URL of the verslag resource — used as the citable source link. */
export function verslagSourceUrl(verslagId: string): string {
  return `${BASE_URL}/Verslag(${verslagId})/resource`;
}
