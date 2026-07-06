# Myanmar Incorporation Extractor

Extracts key data from signed **Myanmar Incorporation Services Proposal**
contracts (PDF) and generates a structured Excel checklist so anyone outside
the deal team can understand a contract's key terms at a glance.

## How it works

1. **Upload** a signed proposal PDF.
2. The server extracts the PDF's text layer (`pdf-parse`) and sends it to
   **GPT-4o** with a structured-extraction prompt (text-based, not
   vision/image-based). The model returns JSON only.
3. Dates, contract-term math (start/end/renewal/invoice-due dates, stamp
   duty applicability, one-time-service detection) are computed
   deterministically in code — never trusted to the model.
4. A **review screen** shows every field in an editable form so staff can
   correct any misread value (in particular, the Signing Date is clearly
   flagged if it was blank or unparseable in the source PDF).
5. **Generate & Download Excel** re-sends the (possibly edited) fields to
   the server, which recomputes all derived fields authoritatively and
   streams back an `.xlsx` checklist.

## This template has no checkboxes

Unlike other FocusCore proposal templates, the Myanmar Incorporation
Services Proposal doesn't use checkboxes — every row in the "Our
Professional Fees" table is a service the client purchased. That rule lives
in a **template strategy** (`lib/templates/myanmarIncorporation.ts`)
implementing a shared `TemplateStrategy` interface
(`lib/templates/types.ts`). A future template that *does* use
checkboxes/marks can be added as a new strategy and registered in
`lib/templates/registry.ts` without touching extraction, date math, or
Excel generation.

## Project structure

```
app/
  page.tsx                 Upload + editable review UI
  api/extract/route.ts     PDF -> text -> GPT-4o -> extracted fields (JSON)
  api/generate/route.ts    Edited fields (JSON) -> recomputed fields -> .xlsx
lib/
  types.ts                 Shared ExtractedFields / ServiceLine shapes
  pdfText.ts               PDF text-layer extraction (pdf-parse)
  extractFields.ts         OpenAI call + orchestration for /api/extract
  deriveFields.ts          Pure date/financial derivation (shared client+server)
  dateUtils.ts             DD/MM/YYYY-first date parsing & arithmetic
  dateUtils.test.ts        Unit tests (vitest) for date parsing rules
  excelGenerator.ts        Builds the sectioned .xlsx workbook (exceljs)
  config/contractTerms.ts  Standard template T&Cs (5yr term, 2yr renewal, etc.)
  templates/
    types.ts               TemplateStrategy interface
    myanmarIncorporation.ts  This template's strategy (no checkbox logic)
    registry.ts             Template id -> strategy lookup
```

## Date parsing rules

- Purely numeric dates (`06/07/2026`, `6/7/2026`) are always parsed
  **day-first (DD/MM/YYYY)** — never month-first.
- Dates with a text month (`6 Jul 2026`, `07 June 2026`) parse directly
  from the month name.
- A blank or unparseable Signing Date is **flagged for manual review**,
  never silently replaced with the Proposal Issue Date.

## Setup

```bash
npm install
```

Create `.env.local` with your OpenAI API key:

```
OPENAI_API_KEY=sk-...
```

Run the dev server:

```bash
npm run dev
```

Open http://localhost:3000.

## Testing

```bash
npm test
```

Runs the `vitest` unit tests for `lib/dateUtils.ts` (numeric/text-month
parsing, day-first disambiguation, blank/unparseable flagging, and the
derived-date arithmetic used for term-end and invoice-due dates).

## Deployment (Vercel)

```bash
npx vercel --prod
```

Set the `OPENAI_API_KEY` environment variable in the Vercel project
settings (Project → Settings → Environment Variables) before deploying, or
via:

```bash
npx vercel env add OPENAI_API_KEY
```

`vercel.json` sets a 30s max duration on both API routes to allow time for
PDF text extraction and the GPT-4o call.
