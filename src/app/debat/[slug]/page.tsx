import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDate, getAllDebates, getDebate } from "@/lib/data";

export async function generateStaticParams() {
  const debates = await getAllDebates();
  return debates.map((debate) => ({ slug: debate.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const debate = await getDebate(slug);
  return { title: debate ? `${debate.title} — Politiek voor Iedereen` : "Debat" };
}

export default async function DebatePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const debate = await getDebate(slug);
  if (!debate) notFound();

  return (
    <article>
      <Link href="/" className="text-sm text-slate-500 hover:text-slate-700">
        ← Alle debatten
      </Link>

      <p className="mt-4 text-sm text-slate-500">{formatDate(debate.date)}</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
        {debate.title}
      </h1>

      <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Deze samenvatting is automatisch gemaakt op basis van het officiële
        verslag. Controleer bij twijfel de bron onderaan deze pagina.
      </p>

      {debate.verification.status === "flagged" && (
        <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          De automatische controle heeft bij deze samenvatting kanttekeningen
          geplaatst. Lees het officiële verslag voor de zekerheid.
        </p>
      )}

      <Section title="Waar ging het over?">
        <p className="text-slate-700">{debate.summary.what}</p>
      </Section>

      <Section title="De belangrijkste punten">
        <ul className="list-disc space-y-2 pl-5 text-slate-700">
          {debate.summary.keyPoints.map((point, i) => (
            <li key={i}>{point}</li>
          ))}
        </ul>
      </Section>

      <Section title="Wat vonden de partijen?">
        <dl className="space-y-3">
          {debate.summary.partyPositions.map((position, i) => (
            <div key={i}>
              <dt className="font-semibold text-slate-900">
                {position.party}
              </dt>
              <dd className="text-slate-700">{position.position}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title="Wat is er besloten?">
        {debate.summary.decisions.length > 0 ? (
          <ul className="list-disc space-y-2 pl-5 text-slate-700">
            {debate.summary.decisions.map((decision, i) => (
              <li key={i}>{decision}</li>
            ))}
          </ul>
        ) : (
          <p className="text-slate-700">
            Bij dit debat zijn (nog) geen formele besluiten genomen.
          </p>
        )}
      </Section>

      {debate.glossary.length > 0 && (
        <Section title="Moeilijke woorden">
          <div className="space-y-2">
            {debate.glossary.map((entry, i) => (
              <details
                key={i}
                className="rounded-lg border border-slate-200 bg-white px-4 py-3"
              >
                <summary className="cursor-pointer font-medium text-slate-900">
                  {entry.term}
                </summary>
                <p className="mt-2 text-slate-700">{entry.explanation}</p>
              </details>
            ))}
          </div>
        </Section>
      )}

      <Section title="Bronnen">
        <a
          href={debate.sources.verslag}
          className="text-blue-700 underline hover:text-blue-900"
          target="_blank"
          rel="noopener noreferrer"
        >
          Officieel verslag (Tweede Kamer)
        </a>
      </Section>
    </article>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8 border-t border-slate-200 pt-6">
      <h2 className="mb-3 text-lg font-semibold text-slate-900">{title}</h2>
      {children}
    </section>
  );
}
