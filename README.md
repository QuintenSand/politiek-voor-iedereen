# Politiek voor Iedereen

Een website die plenaire debatten van de Tweede Kamer in gewone taal uitlegt,
zodat iedereen kan volgen wat er in Den Haag wordt besproken.

De samenvattingen zijn **strikt feitelijk**: ze geven alleen weer wát er is
gezegd en besloten — geen oordeel, geen duiding. Moeilijke termen worden wél
uitgelegd. Elke pagina linkt naar het officiële verslag, zodat je alles kunt
nalezen.

## Hoe het werkt

De site draait op een pijplijn van drie stappen:

1. **Ophalen** — `pipeline/fetch-debate.ts` haalt via de
   [Tweede Kamer Open Data API](https://opendata.tweedekamer.nl) het meest
   recente definitieve verslag van een plenaire vergadering op en splitst dat
   in losse debatten. Elk debat wordt als ruw transcript opgeslagen in
   `data/raw/`.

2. **Samenvatten + controleren** — `pipeline/summarize-debate.ts` stuurt een
   transcript naar de Claude API. Claude maakt een samenvatting volgens een
   vast sjabloon (taalniveau B1, strikt feitelijk). Daarna controleert een
   tweede AI-stap of elke bewering echt in het verslag staat en of de toon
   neutraal is. Het resultaat komt als JSON in `data/debates/`.

3. **Tonen** — de Next.js-website (`src/`) leest die JSON-bestanden en maakt er
   pagina's van: een overzicht van alle debatten en een detailpagina per debat.

De hele keten is bedoeld om automatisch te draaien, zonder handmatige redactie.

## Projectstructuur

```
pipeline/                Data-pijplijn (TypeScript, los van de website)
  fetch-debate.ts          Stap 1: debatten ophalen
  summarize-debate.ts      Stap 2: samenvatten + controleren
  lib/                     API-client en verslag-parser
src/
  app/                   Next.js-pagina's (overzicht + debat-detail)
  lib/                   Datamodel en datatoegang
data/
  raw/                   Ruwe transcripten (niet in git)
  debates/               Verwerkte debatten — de bron voor de website
```

## Aan de slag

### Vereisten

- Node.js 22 of nieuwer
- Een Anthropic API-sleutel (voor de AI-stap)

### Installeren

```bash
npm install
```

### API-sleutel instellen

Maak een bestand `.env` in de hoofdmap van het project:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Dit bestand staat in `.gitignore` en wordt niet meegecommit.

### De pijplijn draaien

```bash
# Stap 1: het recentste plenaire verslag ophalen
npx tsx pipeline/fetch-debate.ts

# Stap 2: de opgehaalde debatten samenvatten en controleren
npx tsx pipeline/summarize-debate.ts
```

### De website draaien

```bash
npm run dev      # ontwikkelserver op http://localhost:3000
npm run build    # productieversie bouwen
```
