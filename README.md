# MediBot

> **A calmer, clearer way to prepare for a conversation about your health.**

**GitHub description:** A polished Next.js health-information assistant prototype with local PDF/CSV report previews, symptom and voice input, optional location permission, and a privacy-first interface.

MediBot is a responsive web application prototype exploring how people could bring health documents and personal questions together in one approachable workspace. It pairs a premium, accessible dashboard with a report intake flow, a browser-based text extraction preview, and guided next steps for preparing to speak with a care provider.

The current build is intentionally a **front-end prototype**, not a medical analysis service. Text-based PDFs and CSV files can be previewed locally in the browser; they are not uploaded or saved by the app. MediBot does not interpret results, diagnose conditions, recommend treatment, or search for real providers.

## What you can try

- **Add a report:** Select or drag in up to five text-based PDF or CSV files (maximum 25 MB each). PDF text is extracted in the browser and displayed as a preview; CSV content is shown as text.
- **Describe a concern:** Enter a symptom note or try browser-supported voice input. The prototype does not submit it to an AI service.
- **Review the workspace:** Explore the responsive dashboard, sample report-list presentation, visit-preparation checklist, and privacy notice. Sample report rows are illustrative UI content, not user records.
- **Choose whether to share location:** The provider-discovery card requests browser location permission only after you choose it. Provider search is not connected.
- **Prepare a visit summary:** Open the browser print dialog to print or save the current page.

## Privacy and safety

- File reading and PDF text extraction happen in the browser. The prototype does not send reports to a backend or persist them as application data.
- Scanned/image-only PDFs and image files are not supported; OCR is not configured.
- There is no connected LLM, clinical review workflow, provider directory, appointment booking, account system, or report storage.
- This prototype is not a medical device or a substitute for professional medical advice. Do not use it to make health decisions.
- Do not describe this project as HIPAA- or GDPR-compliant. A production service would require appropriate legal, clinical, security, privacy, and vendor review before handling health information.

## Tech stack

- [Next.js](https://nextjs.org/) App Router and React
- TypeScript
- Custom responsive CSS
- [Lucide](https://lucide.dev/) icons
- [PDF.js](https://mozilla.github.io/pdf.js/) for in-browser extraction of selectable PDF text

## Run locally

Requirements: Node.js and npm.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). If port 3000 is already in use, Next.js will report the alternate local port it selected.

## Quality checks

```bash
npm run build
npm run typecheck
npm audit
```

## Current limitations

- PDF extraction reads selectable text only; it does not perform OCR.
- CSV is presented as source text; there is no clinical variable parsing or terminology mapping.
- Report content is not normalized, analyzed, or compared against reference intervals.
- Symptom text is not submitted to a model.
- Provider search, appointment booking, secure sharing, authentication, audit logging, and data-deletion services are not implemented.
- The report library contains illustrative sample entries.

## Direction for a production service

A real health service would need a carefully scoped backend; authenticated, per-user access controls; secure document processing and retention/deletion workflows; validated OCR and terminology mapping; evaluated clinical safety behavior with clinician oversight; approved model and provider-data integrations; audit trails; accessibility and security testing; and jurisdiction-specific privacy and regulatory review. Treat each as unimplemented until designed, built, independently reviewed, and tested.
