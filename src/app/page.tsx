import Link from "next/link";
import { formatDate, getAllDebates } from "@/lib/data";

export default async function Home() {
  const debates = await getAllDebates();

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
        Wat is er besproken in Den Haag?
      </h1>
      <p className="mt-2 text-slate-600">
        Hieronder vind je plenaire debatten van de Tweede Kamer, kort en in
        gewone taal uitgelegd.
      </p>

      {debates.length === 0 ? (
        <p className="mt-10 rounded-lg border border-slate-200 bg-white p-6 text-slate-500">
          Er zijn nog geen debatten verwerkt.
        </p>
      ) : (
        <ul className="mt-8 space-y-4">
          {debates.map((debate) => (
            <li key={debate.slug}>
              <Link
                href={`/debat/${debate.slug}`}
                className="block rounded-lg border border-slate-200 bg-white p-5 transition-colors hover:border-slate-300 hover:bg-slate-50"
              >
                <p className="text-sm text-slate-500">
                  {formatDate(debate.date)}
                </p>
                <h2 className="mt-1 text-lg font-semibold text-slate-900">
                  {debate.title}
                </h2>
                <p className="mt-2 line-clamp-3 text-slate-600">
                  {debate.summary.what}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
