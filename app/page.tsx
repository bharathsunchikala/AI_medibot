"use client";

import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  AudioLines,
  CalendarDays,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  FileHeart,
  FileText,
  Heart,
  HeartPulse,
  LockKeyhole,
  MapPin,
  Menu,
  Mic,
  MoreHorizontal,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Upload,
  X,
} from "lucide-react";
import { ChangeEvent, useRef, useState } from "react";

type SpeechRecognitionLike = {
  lang: string;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  start: () => void;
};

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

type InputMode = "document" | "symptoms";
type ExtractedReport = { fileName: string; text: string; pages?: number };

export default function Home() {
  const [mode, setMode] = useState<InputMode>("document");
  const [files, setFiles] = useState<File[]>([]);
  const [symptoms, setSymptoms] = useState("");
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [locationStatus, setLocationStatus] = useState("");
  const [consentVisible, setConsentVisible] = useState(true);
  const [notice, setNotice] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedReports, setExtractedReports] = useState<ExtractedReport[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);

  function appendFiles(selected: File[]) {
    const allowedTypes = new Set(["application/pdf", "text/csv"]);
    const validFiles = selected.filter((file) => {
      const extension = file.name.toLowerCase().split(".").pop();
      return (
        allowedTypes.has(file.type) ||
        (extension !== undefined && ["pdf", "csv"].includes(extension))
      );
    });

    if (validFiles.length !== selected.length) {
      setNotice("Some files were not added. Choose a text-based PDF or CSV report.");
    } else if (files.length + validFiles.length > 5) {
      setNotice("You can add up to five files.");
    } else if (validFiles.some((file) => file.size > 25 * 1024 * 1024)) {
      setNotice("Each report must be 25 MB or smaller.");
    } else {
      setNotice("");
      setExtractedReports([]);
      setFiles((current) => [...current, ...validFiles]);
    }
  }

  function addFiles(event: ChangeEvent<HTMLInputElement>) {
    appendFiles(Array.from(event.target.files ?? []));
    event.target.value = "";
  }

  async function extractReport(file: File): Promise<ExtractedReport> {
    const extension = file.name.toLowerCase().split(".").pop();
    if (extension === "csv" || file.type === "text/csv") {
      const text = (await file.text()).slice(0, 12_000);
      if (!text.trim()) throw new Error(`${file.name} is empty.`);
      return { fileName: file.name, text };
    }

    if (extension === "pdf" || file.type === "application/pdf") {
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString();
      const document = await pdfjs.getDocument({
        data: new Uint8Array(await file.arrayBuffer()),
        isEvalSupported: false,
      }).promise;
      const pageTexts: string[] = [];
      const pagesToRead = Math.min(document.numPages, 20);

      for (let pageNumber = 1; pageNumber <= pagesToRead; pageNumber += 1) {
        const page = await document.getPage(pageNumber);
        const content = await page.getTextContent();
        const pageText = content.items
          .map((item) => ("str" in item ? item.str : ""))
          .filter(Boolean)
          .join(" ");
        pageTexts.push(`Page ${pageNumber}\n${pageText}`);
      }

      const text = pageTexts.join("\n\n").slice(0, 12_000);
      if (!text.replace(/Page \d+/g, "").trim()) {
        throw new Error(
          `${file.name} has no selectable text. Scanned-image OCR is not enabled yet.`,
        );
      }
      return { fileName: file.name, text, pages: document.numPages };
    }

    throw new Error(`${file.name}: image OCR is not enabled yet. Please use a text-based PDF or CSV.`);
  }

  function requestLocation() {
    if (!navigator.geolocation) {
      setLocationStatus("Location is not available in this browser.");
      return;
    }
    setLocationStatus("Waiting for your permission…");
    navigator.geolocation.getCurrentPosition(
      () => {
        setLocationEnabled(true);
        setLocationStatus("Location permission granted for this session.");
      },
      () => {
        setLocationEnabled(false);
        setLocationStatus(
          "Location was not shared. You can still use MediBot without it.",
        );
      },
      { maximumAge: 60_000, timeout: 10_000 },
    );
  }

  function startRecording() {
    const SpeechRecognitionApi =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionApi) {
      setNotice("Voice input is not supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognitionApi();
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) setSymptoms((value) => `${value}${value ? " " : ""}${transcript}`);
    };
    recognition.onerror = () => setNotice("Voice input could not be captured.");
    recognition.start();
    setNotice("Listening… speak clearly, then stop the recording.");
  }

  async function submitForReview() {
    if (mode === "document" && files.length === 0) {
      setNotice("Add a report first, or choose symptom description.");
      return;
    }
    if (mode === "symptoms" && !symptoms.trim()) {
      setNotice("Describe what you would like to discuss.");
      return;
    }
    if (mode === "symptoms") {
      setNotice(
        "Your symptom note stays in this browser. Medical analysis is not connected in this prototype.",
      );
      return;
    }

    setIsProcessing(true);
    setNotice("Reading your report locally in this browser…");
    setExtractedReports([]);
    try {
      const results: ExtractedReport[] = [];
      for (const file of files) results.push(await extractReport(file));
      setExtractedReports(results);
      setNotice("Report text extracted locally. No file was uploaded.");
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Could not read this report. Try another PDF or CSV file.",
      );
    } finally {
      setIsProcessing(false);
    }
  }

  function exportReport() {
    window.print();
  }

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Main navigation">
        <a className="brand" href="#" aria-label="MediBot home">
          <span className="brand-mark"><HeartPulse size={21} strokeWidth={2.3} /></span>
          <span>Medi<span>Bot</span></span>
        </a>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="nav-list">
          <a className="nav-item active" href="#overview"><Activity size={18} /> Overview</a>
          <a className="nav-item" href="#reports"><FileHeart size={18} /> My reports <span className="nav-count">3</span></a>
          <a className="nav-item" href="#care"><Stethoscope size={18} /> Find care</a>
          <a className="nav-item" href="#appointments"><CalendarDays size={18} /> Appointments</a>
        </nav>
        <div className="sidebar-spacer" />
        <div className="privacy-card">
          <div className="privacy-icon"><ShieldCheck size={17} /></div>
          <strong>Your health stays yours</strong>
          <p>Your information should only be used with your permission.</p>
          <a href="#privacy">Privacy settings <ArrowRight size={13} /></a>
        </div>
        <button className="profile-button" type="button">
          <span className="avatar">JD</span>
          <span className="profile-copy"><strong>Jamie Davis</strong><small>Personal account</small></span>
          <MoreHorizontal size={18} className="profile-more" />
        </button>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <button className="mobile-menu icon-button" aria-label="Open menu" type="button"><Menu size={20} /></button>
          <div className="breadcrumb">Workspace <span>/</span> <strong>Overview</strong></div>
          <div className="topbar-actions">
            <span className="secure-label"><LockKeyhole size={13} /> Private workspace</span>
            <button className="icon-button help-button" aria-label="Help" type="button"><CircleHelp size={19} /></button>
          </div>
        </header>

        <div className="content">
          <section className="welcome-row" id="overview">
            <div>
              <div className="eyebrow"><span className="eyebrow-dot" /> YOUR HEALTH, IN CONTEXT</div>
              <h1>A little more clarity.<br /><span>A lot more confidence.</span></h1>
              <p className="welcome-copy">Bring your health information together and feel more prepared for your next conversation with your care team.</p>
            </div>
            <div className="welcome-art" aria-hidden="true">
              <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
              <div className="art-heart"><HeartPulse size={47} strokeWidth={1.35} /></div>
              <span className="art-spark spark-a"><Sparkles size={16} /></span>
              <span className="art-spark spark-b"><Plus size={15} /></span>
            </div>
          </section>

          <section className="workspace-grid">
            <div className="primary-column">
              <section className="card intake-card" aria-labelledby="intake-title">
                <div className="card-heading">
                  <div className="step-icon"><span>01</span></div>
                  <div><h2 id="intake-title">Start with what’s on your mind</h2><p>Share a report or tell us what you’d like help understanding.</p></div>
                </div>
                <div className="tabs" role="tablist" aria-label="Choose what to share">
                  <button type="button" role="tab" aria-selected={mode === "document"} className={mode === "document" ? "tab active" : "tab"} onClick={() => { setMode("document"); setNotice(""); }}>
                    <FileText size={16} /> My documents
                  </button>
                  <button type="button" role="tab" aria-selected={mode === "symptoms"} className={mode === "symptoms" ? "tab active" : "tab"} onClick={() => { setMode("symptoms"); setNotice(""); }}>
                    <Heart size={16} /> Describe symptoms
                  </button>
                </div>
                {mode === "document" ? (
                  <div
                    className="dropzone"
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      appendFiles(Array.from(event.dataTransfer.files));
                    }}
                  >
                    <input ref={fileInput} type="file" accept=".pdf,.csv,application/pdf,text/csv" multiple hidden onChange={addFiles} aria-label="Choose health documents" />
                    <div className="upload-symbol"><Upload size={20} /></div>
                    <strong>Drop your files here, or <button className="text-button" type="button" onClick={() => fileInput.current?.click()}>browse</button></strong>
                    <span>Text-based PDF or CSV <i>·</i> up to 5 files, 25 MB each</span>
                    {files.length > 0 && <ul className="file-list">{files.map((file, index) => <li key={`${file.name}-${index}`}><FileText size={15} /><span>{file.name}</span><small>{(file.size / (1024 * 1024)).toFixed(1)} MB</small><button aria-label={`Remove ${file.name}`} type="button" onClick={() => { setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index)); setExtractedReports([]); }}><X size={15} /></button></li>)}</ul>}
                  </div>
                ) : (
                  <div className="symptom-box">
                    <label htmlFor="symptoms">What would you like to understand?</label>
                    <textarea id="symptoms" maxLength={2000} value={symptoms} onChange={(event) => setSymptoms(event.target.value)} placeholder="For example: I’ve been feeling more tired than usual this week…" />
                    <div className="symptom-footer"><span>{symptoms.length}/2,000</span><button type="button" className="voice-button" onClick={startRecording}><Mic size={15} /> Use voice</button></div>
                  </div>
                )}
                {notice && <p className="inline-notice" role="status">{notice}</p>}
                <div className="intake-footer">
                  <span className="local-note"><LockKeyhole size={14} /> Read locally in your browser</span>
                  <button type="button" className="primary-button" onClick={submitForReview} disabled={isProcessing}>{isProcessing ? "Reading report…" : mode === "document" ? "Review report" : "Continue"} {isProcessing ? <span className="button-spinner" /> : <ArrowRight size={16} />}</button>
                </div>
              </section>

              {extractedReports.length > 0 && (
                <section className="card extraction-card" aria-live="polite">
                  <div className="section-title-row">
                    <div><div className="overline">LOCAL EXTRACTION PREVIEW</div><h2>Report text</h2></div>
                    <span className="local-badge"><LockKeyhole size={12} /> Stays on this device</span>
                  </div>
                  {extractedReports.map((report) => (
                    <div className="extracted-report" key={report.fileName}>
                      <div className="extracted-title"><FileText size={15} /><strong>{report.fileName}</strong>{report.pages && <span>{report.pages} pages</span>}</div>
                      <pre>{report.text}</pre>
                    </div>
                  ))}
                  <p className="extraction-caveat">This is extracted source text, not a medical interpretation. Check it against the original report. Scanned/image-only PDFs and image OCR are not supported yet.</p>
                </section>
              )}

              <section className="card reports-card" id="reports">
                <div className="section-title-row">
                  <div><div className="overline">YOUR HEALTH LIBRARY</div><h2>Recently added</h2></div>
                  <button className="subtle-link" type="button" onClick={() => setNotice("Your saved reports will appear here once secure storage is connected.")}>View all <ArrowRight size={14} /></button>
                </div>
                <div className="report-list">
                  <div className="report-row">
                    <span className="report-file-icon lilac"><FileText size={18} /></span>
                    <span className="report-info"><strong>Annual blood panel</strong><small>PDF report <i>·</i> Added just now</small></span>
                    <span className="report-status"><span /> Ready to review</span>
                    <button aria-label="More options for Annual blood panel" className="row-more" type="button"><MoreHorizontal size={19} /></button>
                  </div>
                  <div className="report-row">
                    <span className="report-file-icon mint"><Activity size={18} /></span>
                    <span className="report-info"><strong>Wellness check-in</strong><small>Personal note <i>·</i> Oct 6, 2026</small></span>
                    <span className="report-status reviewed"><Check size={12} /> Reviewed</span>
                    <button aria-label="More options for Wellness check-in" className="row-more" type="button"><MoreHorizontal size={19} /></button>
                  </div>
                  <div className="report-row">
                    <span className="report-file-icon peach"><FileText size={18} /></span>
                    <span className="report-info"><strong>Metabolic panel</strong><small>PDF report <i>·</i> Sep 28, 2026</small></span>
                    <span className="report-status reviewed"><Check size={12} /> Reviewed</span>
                    <button aria-label="More options for Metabolic panel" className="row-more" type="button"><MoreHorizontal size={19} /></button>
                  </div>
                </div>
                <div className="demo-caption"><span className="demo-dot" /> Sample interface content — no real reports are stored</div>
              </section>
            </div>

            <aside className="secondary-column">
              <section className="card next-step-card">
                <div className="section-title-row compact">
                  <div><div className="overline">YOUR NEXT STEP</div><h2>Make the most of your visit</h2></div>
                  <span className="step-icon small"><CalendarDays size={16} /></span>
                </div>
                <p className="next-copy">A little preparation can make it easier to get the answers you need.</p>
                <div className="checklist">
                  <div><span className="check-circle"><Check size={12} /></span><span>Gather recent test results</span></div>
                  <div><span className="check-circle"><Check size={12} /></span><span>Note questions as they come up</span></div>
                  <div><span className="check-circle empty" /><span>Share a summary with your doctor</span></div>
                </div>
                <button className="outline-button full-button" type="button" onClick={exportReport}><ArrowDownToLine size={15} /> Prepare a visit summary</button>
              </section>

              <section className="care-card" id="care">
                <div className="care-decoration" aria-hidden="true"><span /><span /><span /></div>
                <div className="care-content">
                  <div className="care-icon"><MapPin size={18} /></div>
                  <div className="overline light">CARE, CLOSER TO YOU</div>
                  <h2>Looking for a<br />care provider?</h2>
                  <p>Discover care options near you. Your location is always optional.</p>
                  <button type="button" className="care-button" onClick={requestLocation}><Search size={15} /> {locationEnabled ? "Location shared" : "Explore nearby care"} <ArrowRight size={14} /></button>
                  {locationStatus && <p className="location-status" role="status">{locationStatus}</p>}
                  {locationEnabled && <p className="demo-caption light-caption">Provider search is not connected in this prototype.</p>}
                </div>
              </section>

              <section className="trust-note" id="privacy">
                <span><ShieldCheck size={17} /></span>
                <p><strong>Your privacy matters.</strong> Your health information belongs to you. Review how it’s used, stored, and shared before connecting any services.</p>
                <button aria-label="Learn more about privacy" type="button"><ArrowRight size={15} /></button>
              </section>
            </aside>
          </section>

          <footer className="page-footer">
            <span><LockKeyhole size={12} /> Designed with privacy in mind</span>
            <span>© 2026 MediBot <i>·</i> <a href="#privacy">Privacy</a> <i>·</i> <a href="#privacy">Terms</a></span>
          </footer>
        </div>
      </div>

      {consentVisible && (
        <div className="consent-banner" role="region" aria-label="Privacy notice">
          <div className="consent-icon"><ShieldCheck size={19} /></div>
          <div className="consent-copy"><strong>Your health information is personal.</strong><span>This prototype does not send or store the details you enter. In a live service, you would review privacy and consent settings first.</span></div>
          <a href="#privacy" className="consent-link">Privacy details</a>
          <button className="consent-dismiss" type="button" onClick={() => setConsentVisible(false)} aria-label="Dismiss privacy notice"><X size={17} /></button>
        </div>
      )}
      <div className="sr-only" aria-live="polite">{locationStatus}</div>
    </main>
  );
}
