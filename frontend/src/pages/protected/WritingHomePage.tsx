import { motion } from "framer-motion";
import { useDeferredValue, useEffect, useMemo, useState, type MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import ContextBuilder from "../../components/ContextBuilder";
import { createArtifact, createRun, deleteArtifact, listArtifacts, renameArtifact, type ArtifactRecord, type RunRecord } from "../../lib/api";
import { buildWritingArtifactInput } from "../../lib/artifactDrafts";
import { fadeUp } from "../../lib/theme";

let writingDocumentsCache: ArtifactRecord[] | null = null;

const writingTemplates = [
  {
    title: "Executive Launch Brief",
    label: "Launch brief",
    content: [
      "# Executive Launch Brief",
      "",
      "## Decision",
      "",
      "## Customer Insight",
      "",
      "## Market Evidence",
      "",
      "## Data Signal",
      "",
      "## Financial Read",
      "",
      "## Recommendation",
      "",
      "## Open Risks",
      "",
      "## Next Actions",
    ].join("\n"),
  },
  {
    title: "Retail Pilot Summary",
    label: "Retail pilot",
    content: [
      "# Retail Pilot Summary",
      "",
      "## Pilot Objective",
      "",
      "## Store Profile",
      "",
      "## Product Format",
      "",
      "## Success Metrics",
      "",
      "## Operating Constraints",
      "",
      "## Readout Plan",
    ].join("\n"),
  },
  {
    title: "Landing Page Copy",
    label: "Landing page",
    content: [
      "# Landing Page Copy",
      "",
      "## Hero",
      "",
      "## Product Story",
      "",
      "## Why It Works",
      "",
      "## Proof Points",
      "",
      "## Call To Action",
    ].join("\n"),
  },
  {
    title: "Launch Email",
    label: "Launch email",
    content: [
      "# Launch Email",
      "",
      "Subject:",
      "",
      "Preview text:",
      "",
      "## Opening",
      "",
      "## Product Detail",
      "",
      "## Reason To Believe",
      "",
      "## Action",
    ].join("\n"),
  },
];

const launchKitDocuments = [
  { title: "Executive Launch Brief", brief: "Summarize the decision, evidence, recommendation, and executive risks." },
  { title: "Retail Pilot Summary", brief: "Describe pilot objective, target store profile, operating constraints, and success metrics." },
  { title: "Landing Page Copy", brief: "Write concise product page copy with proof points and a clear call to action." },
  { title: "Launch Email", brief: "Draft an internal or partner-facing launch email with subject, preview text, and body." },
];

function getKitDocuments(run: RunRecord | null) {
  const documents = run?.output?.documents;
  if (!Array.isArray(documents)) return [];
  return documents
    .map((document) => {
      if (!document || typeof document !== "object") return null;
      const record = document as { title?: unknown; content?: unknown; summary?: unknown };
      const title = typeof record.title === "string" ? record.title : "Untitled Document";
      const content = typeof record.content === "string" ? record.content : "";
      const summary = typeof record.summary === "string" ? record.summary : content.slice(0, 180);
      return content.trim() ? { title, content, summary } : null;
    })
    .filter((document): document is { title: string; content: string; summary: string } => Boolean(document));
}

function DocumentGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3.5h6.5L20 9v11.5A2.5 2.5 0 0 1 17.5 23h-9A2.5 2.5 0 0 1 6 20.5V6A2.5 2.5 0 0 1 8.5 3.5Z" />
      <path d="M14 3.5V9h5.5" />
      <path d="M9 13h6" />
      <path d="M9 16.5h6" />
    </svg>
  );
}

function PenGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="m4 20 4.7-1 10-10a2.4 2.4 0 0 0-3.4-3.4l-10 10L4 20Z" />
      <path d="M13.8 7.2 16.8 10.2" />
      <path d="M5.3 15.4 8.6 18.7" />
    </svg>
  );
}

function SparkGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3 1.7 4.8L18.5 9.5l-4.8 1.7L12 16l-1.7-4.8L5.5 9.5l4.8-1.7Z" />
      <path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8Z" />
    </svg>
  );
}

function SearchGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

function ListGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 6h12" />
      <path d="M8 12h12" />
      <path d="M8 18h12" />
      <path d="M4 6h.01" />
      <path d="M4 12h.01" />
      <path d="M4 18h.01" />
    </svg>
  );
}

function GridGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="6" height="6" rx="1.4" />
      <rect x="14" y="4" width="6" height="6" rx="1.4" />
      <rect x="4" y="14" width="6" height="6" rx="1.4" />
      <rect x="14" y="14" width="6" height="6" rx="1.4" />
    </svg>
  );
}

function ArrowGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function matchesDocumentQuery(document: ArtifactRecord, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  const haystack = [
    document.title,
    document.summary ?? "",
    document.content,
    document.contentFormat,
    ...document.tags,
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(normalized);
}

export default function WritingHomePage() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<ArtifactRecord[]>(() => writingDocumentsCache ?? []);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [loading, setLoading] = useState(() => writingDocumentsCache === null);
  const [docMenu, setDocMenu] = useState<{
    documentId: string;
    x: number;
    y: number;
    phase: "default" | "rename" | "confirm";
    renameValue: string;
  } | null>(null);
  const [kitPrompt, setKitPrompt] = useState(
    "Using the attached artifacts and current launch context, create a launch kit with an executive brief, retail pilot summary, landing page copy, and launch email. Keep each document concise, evidence-backed, and ready to save.",
  );
  const [kitContextIds, setKitContextIds] = useState<string[]>([]);
  const [kitRun, setKitRun] = useState<RunRecord | null>(null);
  const [kitStatus, setKitStatus] = useState("Ready");
  const [kitLoading, setKitLoading] = useState(false);
  const [savingKit, setSavingKit] = useState(false);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(writingDocumentsCache === null);
        const response = await listArtifacts({ studio: "writing", limit: 100 });
        if (active) {
          writingDocumentsCache = response.items;
          setDocuments(response.items);
          setError(null);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load writing library.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!docMenu) return;

    const closeMenu = () => setDocMenu(null);
    window.addEventListener("click", closeMenu);
    window.addEventListener("keydown", closeMenu);

    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("keydown", closeMenu);
    };
  }, [docMenu]);

  const filteredDocuments = useMemo(
    () => documents.filter((document) => matchesDocumentQuery(document, deferredQuery)),
    [documents, deferredQuery],
  );
  const kitDocuments = useMemo(() => getKitDocuments(kitRun), [kitRun]);

  const syncDocuments = (updater: (current: ArtifactRecord[]) => ArtifactRecord[]) => {
    setDocuments((current) => {
      const next = updater(current);
      writingDocumentsCache = next;
      return next;
    });
  };

  const openTemplate = (template: (typeof writingTemplates)[number]) => {
    navigate("/writing/new", { state: { template: { title: template.title, content: template.content } } });
  };

  const runLaunchKit = async () => {
    if (!kitPrompt.trim()) return;
    setKitLoading(true);
    setKitStatus("Generating launch kit...");
    setKitRun(null);
    try {
      const response = await createRun({
        studio: "writing",
        title: "Writing launch kit",
        prompt: kitPrompt,
        context_ids: kitContextIds,
        options: {
          mode: "multi_output",
          documents: launchKitDocuments,
        },
      });
      setKitRun(response.run);
      setKitStatus(response.run.status === "completed" ? "Launch kit generated." : response.run.error_message ?? response.run.status);
    } catch (err) {
      setKitStatus(err instanceof Error ? err.message : "Launch kit generation failed.");
    } finally {
      setKitLoading(false);
    }
  };

  const saveLaunchKitDocuments = async () => {
    if (!kitRun || !kitDocuments.length) return;
    setSavingKit(true);
    setKitStatus("Saving launch kit documents...");
    try {
      const saved: ArtifactRecord[] = [];
      for (const document of kitDocuments) {
        const payload = buildWritingArtifactInput({
          title: document.title,
          content: document.content,
          summary: document.summary,
          runId: kitRun.id,
          contextIds: kitContextIds,
        });
        if (!payload) continue;
        const response = await createArtifact({
          ...payload,
          source_run_id: kitRun.id,
          content_json: {
            multiOutputDocument: document,
            sourceRunId: kitRun.id,
            contextIds: kitContextIds,
          },
        });
        saved.push(response.artifact);
      }
      if (saved.length) {
        syncDocuments((current) => [...saved, ...current]);
      }
      setKitStatus(`Saved ${saved.length} document${saved.length === 1 ? "" : "s"} as artifacts.`);
    } catch (err) {
      setKitStatus(err instanceof Error ? err.message : "Could not save launch kit documents.");
    } finally {
      setSavingKit(false);
    }
  };

  const handleDocumentContextMenu = (event: MouseEvent, documentId: string) => {
    event.preventDefault();
    event.stopPropagation();
    const doc = documents.find((d) => d.id === documentId);
    setDocMenu({ documentId, x: event.clientX, y: event.clientY, phase: "default", renameValue: doc?.title ?? "" });
  };

  const handleRenameDocument = async (document: ArtifactRecord, nextTitle: string) => {
    setDocMenu(null);
    const trimmed = nextTitle.trim();
    if (!trimmed || trimmed === document.title) return;

    const previous = documents;
    syncDocuments((current) => current.map((item) => (item.id === document.id ? { ...item, title: trimmed } : item)));

    try {
      const response = await renameArtifact(document.id, { title: trimmed });
      syncDocuments((current) =>
        current.map((item) => (item.id === document.id ? { ...item, title: response.artifact.title } : item)),
      );
    } catch (err) {
      writingDocumentsCache = previous;
      setDocuments(previous);
      setError(err instanceof Error ? err.message : "Failed to rename document.");
    }
  };

  const handleDeleteDocument = async (document: ArtifactRecord) => {
    setDocMenu(null);
    const previous = documents;
    syncDocuments((current) => current.filter((item) => item.id !== document.id));

    try {
      await deleteArtifact(document.id);
    } catch (err) {
      writingDocumentsCache = previous;
      setDocuments(previous);
      setError(err instanceof Error ? err.message : "Failed to delete document.");
    }
  };

  return (
    <div className="relative isolate min-h-full overflow-hidden rounded-xl border border-[#DDE2EA] bg-[#F7F8FA] p-4 text-[#111827] shadow-[0_24px_90px_rgba(15,23,42,0.08)] sm:p-5 lg:p-6">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(15,23,42,0.035)_1px,transparent_1px),linear-gradient(180deg,rgba(15,23,42,0.035)_1px,transparent_1px)] bg-[size:56px_56px]" />

      <motion.section
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="relative overflow-hidden rounded-xl border border-[#0F172A]/10 bg-[#111827] p-6 text-white shadow-[0_24px_76px_rgba(15,23,42,0.22)] sm:p-7 lg:p-8"
      >
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(47,93,211,0.3),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.08),transparent_42%)]" />
        <div className="pointer-events-none absolute inset-x-8 bottom-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />

        <div className="relative grid min-h-[18.5rem] items-stretch gap-8 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="relative flex min-h-[18.5rem] self-stretch flex-col pb-20">
            <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-white/14 bg-white/8 px-3 py-1.5 text-[0.68rem] font-black uppercase tracking-[0.2em] text-white/72">
              <span className="h-2 w-2 rounded-full bg-[#6EA8FE] shadow-[0_0_18px_rgba(110,168,254,0.65)]" />
              Writing Studio
            </div>

            <div className="mt-7 max-w-4xl">
              <h1 className="max-w-5xl font-[Bricolage_Grotesque] text-[clamp(2.25rem,3.7vw,4rem)] font-black leading-[1.06] tracking-[-0.032em]">
                Drafts, briefs, and launch kits.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-white/68 md:text-[1.03rem]">
                Shape polished writing artifacts from templates, saved context, or a multi-document generation run.
              </p>
            </div>

            <div className="absolute bottom-0 left-0 right-0 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate("/writing/new")}
                className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-black text-[#111827] shadow-[0_18px_44px_rgba(255,255,255,0.14)] transition hover:-translate-y-0.5 hover:bg-[#F3F6FB]"
              >
                <PenGlyph />
                New document
              </button>
              <button
                type="button"
                onClick={() => openTemplate(writingTemplates[0])}
                className="inline-flex items-center gap-2 rounded-lg border border-white/18 bg-white/8 px-5 py-3 text-sm font-black text-white backdrop-blur transition hover:-translate-y-0.5 hover:border-white/32 hover:bg-white/14"
              >
                <DocumentGlyph />
                Launch brief
              </button>
            </div>
          </div>

          <div className="grid content-end gap-3 sm:grid-cols-3 xl:grid-cols-1">
            {[
              ["Library", `${documents.length}`, "Saved documents"],
              ["Visible", `${filteredDocuments.length}`, query.trim() ? "Filtered results" : "Current view"],
              ["Context", `${kitContextIds.length}`, "Attached sources"],
            ].map(([label, value, detail]) => (
              <div key={label} className="rounded-lg border border-white/12 bg-white/9 p-3.5 backdrop-blur">
                <div className="text-[0.62rem] font-black uppercase tracking-[0.18em] text-white/46">{label}</div>
                <div className="mt-2 font-[Bricolage_Grotesque] text-[2rem] font-black leading-none tracking-[-0.025em]">{value}</div>
                <div className="mt-1.5 text-[0.72rem] font-medium leading-5 text-white/54">{detail}</div>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {error ? (
        <div className="mt-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      ) : null}

      <motion.div variants={fadeUp} initial="hidden" animate="visible" className="mt-6 grid gap-6 lg:gap-7">
        <section className="rounded-xl border border-[#DDE2EA] bg-white/86 p-6 shadow-[0_18px_58px_rgba(15,23,42,0.07)] backdrop-blur sm:p-7">
          <div className="mb-7 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="text-[0.68rem] font-black uppercase tracking-[0.22em] text-[#667085]">Template wall</div>
              <h2 className="mt-4 max-w-2xl font-[Bricolage_Grotesque] text-[1.85rem] font-black leading-[1.14] tracking-[-0.03em] text-[#111827] md:text-[2.35rem]">
                Start with a strong frame.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[#667085]">
                Choose a blank page or a structured artifact with sections already carved out.
              </p>
            </div>
            <div className="relative w-full xl:w-[23rem]">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#667085]">
                <SearchGlyph />
              </span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search documents"
                className="h-12 w-full rounded-lg border border-[#DDE2EA] bg-[#F7F8FA] pl-12 pr-4 text-sm font-semibold text-[#111827] outline-none transition placeholder:text-[#8A94A6] focus:border-[#2F5DD3]/55 focus:bg-white focus:ring-4 focus:ring-[#2F5DD3]/10"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <button
              className="group relative min-h-[13rem] overflow-hidden rounded-lg border border-[#111827]/10 bg-[#111827] p-5 text-left text-white shadow-[0_18px_48px_rgba(15,23,42,0.16)] transition hover:-translate-y-1 hover:shadow-[0_28px_70px_rgba(15,23,42,0.2)]"
              onClick={() => navigate("/writing/new")}
              type="button"
            >
              <div className="absolute inset-x-0 bottom-0 h-1 bg-[#2F5DD3]" />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-lg border border-white/14 bg-white/10">
                <PenGlyph />
              </div>
              <div className="relative mt-8">
                <strong className="block font-[Bricolage_Grotesque] text-[1.25rem] font-black leading-[1.12] tracking-[-0.02em]">Blank document</strong>
                <span className="mt-3 block text-sm leading-6 text-white/62">Open a clean draft canvas.</span>
              </div>
            </button>

            {writingTemplates.map((template, index) => (
              <button
                className="group relative min-h-[13rem] overflow-hidden rounded-lg border border-[#DDE2EA] bg-white p-5 text-left shadow-[0_14px_34px_rgba(15,23,42,0.045)] transition hover:-translate-y-1 hover:border-[#2F5DD3]/30 hover:shadow-[0_24px_60px_rgba(15,23,42,0.09)]"
                onClick={() => openTemplate(template)}
                type="button"
                key={template.title}
              >
                <div className="absolute inset-x-0 bottom-0 h-1 bg-[#B86B43] opacity-80" />
                <div className="rounded-lg border border-[#DDE2EA] bg-[#F7F8FA] p-3">
                  <div className={index % 2 === 0 ? "h-2 w-[70%] rounded-full bg-[#111827]/18" : "h-2 w-[55%] rounded-full bg-[#111827]/18"} />
                  <div className="mt-3 h-2 w-[90%] rounded-full bg-[#111827]/10" />
                  <div className={index % 3 === 0 ? "mt-3 h-2 w-[80%] rounded-full bg-[#111827]/10" : "mt-3 h-2 w-[88%] rounded-full bg-[#111827]/10"} />
                  <div className="mt-3 h-2 w-[76%] rounded-full bg-[#111827]/10" />
                </div>
                <strong className="mt-5 block font-[Bricolage_Grotesque] text-[1.04rem] font-black leading-[1.18] tracking-[-0.015em] text-[#111827]">{template.label}</strong>
                <span className="mt-3 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-[#667085]">
                  Use template <ArrowGlyph />
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-[#DDE2EA] bg-white/88 p-6 shadow-[0_18px_58px_rgba(15,23,42,0.07)] backdrop-blur sm:p-7">
          <div className="mb-7 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="text-[0.68rem] font-black uppercase tracking-[0.22em] text-[#667085]">Document library</div>
              <h2 className="mt-4 font-[Bricolage_Grotesque] text-[1.85rem] font-black leading-[1.14] tracking-[-0.03em] text-[#111827] md:text-[2.35rem]">
                {loading && !documents.length ? "Loading your documents." : "Open where you left off."}
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-lg border border-[#DDE2EA] bg-[#F7F8FA] px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#667085]">
                {filteredDocuments.length} docs
              </span>
              <div className="inline-flex rounded-lg border border-[#DDE2EA] bg-[#F7F8FA] p-1" role="tablist" aria-label="Document view mode">
                <button
                  type="button"
                  className={`inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-black uppercase tracking-[0.12em] transition ${
                    viewMode === "list" ? "bg-[#111827] text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)]" : "text-[#667085] hover:text-[#111827]"
                  }`}
                  onClick={() => setViewMode("list")}
                >
                  <ListGlyph />
                  List
                </button>
                <button
                  type="button"
                  className={`inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-black uppercase tracking-[0.12em] transition ${
                    viewMode === "grid" ? "bg-[#111827] text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)]" : "text-[#667085] hover:text-[#111827]"
                  }`}
                  onClick={() => setViewMode("grid")}
                >
                  <GridGlyph />
                  Grid
                </button>
              </div>
            </div>
          </div>

          {filteredDocuments.length ? (
            viewMode === "list" ? (
              <div className="overflow-hidden rounded-lg border border-[#DDE2EA] bg-[#F7F8FA]">
                <div className="hidden gap-4 border-b border-[#DDE2EA] px-5 py-4 text-[0.68rem] font-black uppercase tracking-[0.16em] text-[#667085] lg:grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_8.5rem]">
                  <span>Name</span>
                  <span>Summary</span>
                  <span>Last opened</span>
                </div>

                {filteredDocuments.map((document) => (
                  <button
                    key={document.id}
                    className="grid w-full gap-4 border-b border-[#E5EAF1] bg-white/70 px-5 py-5 text-left transition last:border-b-0 hover:bg-white hover:shadow-[0_14px_38px_rgba(15,23,42,0.06)] lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_8.5rem] lg:gap-5"
                    onClick={() => navigate(`/writing/${document.id}`)}
                    onContextMenu={(event) => handleDocumentContextMenu(event, document.id)}
                    type="button"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#111827]/10 bg-[#111827] text-white">
                        <DocumentGlyph />
                      </span>
                      <div className="min-w-0">
                        <strong className="block truncate text-sm font-black leading-6 text-[#111827]">{document.title}</strong>
                        <div className="mt-1 truncate text-xs font-bold uppercase tracking-[0.12em] text-[#8A94A6]">
                          {document.contentFormat.replaceAll("_", " ")}
                          {document.tags.length ? ` - ${document.tags.slice(0, 2).map((tag) => `#${tag}`).join(" ")}` : ""}
                        </div>
                      </div>
                    </div>
                    <p className="line-clamp-2 max-w-2xl text-sm leading-6 text-[#667085]">{document.summary ?? document.content.slice(0, 140)}</p>
                    <span className="self-center text-xs font-black uppercase tracking-[0.12em] text-[#8A94A6]">{new Date(document.updated_at).toLocaleDateString()}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredDocuments.map((document) => (
                  <button
                    key={document.id}
                    className="group min-h-[14rem] rounded-lg border border-[#DDE2EA] bg-white p-5 text-left shadow-[0_14px_34px_rgba(15,23,42,0.045)] transition hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(15,23,42,0.09)]"
                    onClick={() => navigate(`/writing/${document.id}`)}
                    onContextMenu={(event) => handleDocumentContextMenu(event, document.id)}
                    type="button"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#DDE2EA] bg-[#F7F8FA] text-[#111827]">
                        <DocumentGlyph />
                      </span>
                      <span className="text-xs font-black uppercase tracking-[0.12em] text-[#8A94A6]">{new Date(document.updated_at).toLocaleDateString()}</span>
                    </div>
                    <strong className="mt-6 block font-[Bricolage_Grotesque] text-[1.34rem] font-black leading-[1.14] tracking-[-0.025em] text-[#111827]">{document.title}</strong>
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#667085]">{document.summary ?? document.content.slice(0, 140)}</p>
                    <div className="mt-6 text-xs font-black uppercase tracking-[0.14em] text-[#8A94A6]">{document.contentFormat.replaceAll("_", " ")}</div>
                  </button>
                ))}
              </div>
            )
          ) : (
            <div className="rounded-lg border border-dashed border-[#AEB8C7] bg-[#F7F8FA] p-8">
              <h3 className="font-[Bricolage_Grotesque] text-2xl font-black leading-[1.12] tracking-[-0.03em] text-[#111827]">
                {query.trim() ? "No matching documents." : "No documents yet."}
              </h3>
              <p className="mt-3 max-w-xl text-sm leading-7 text-[#667085]">
                {query.trim() ? "Try a different title, tag, or keyword." : "Create a new document to start your writing library."}
              </p>
              <button
                type="button"
                onClick={() => navigate("/writing/new")}
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#111827] px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#2F5DD3]"
              >
                <PenGlyph />
                Create first document
              </button>
            </div>
          )}
        </section>

        <section className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_26rem]">
          <div className="rounded-xl border border-[#111827]/10 bg-[#111827] p-6 text-white shadow-[0_24px_76px_rgba(15,23,42,0.2)] sm:p-7">
            <div className="mb-7 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <div className="text-[0.68rem] font-black uppercase tracking-[0.22em] text-white/46">Launch kit generator</div>
                <h2 className="mt-4 max-w-3xl font-[Bricolage_Grotesque] text-[1.85rem] font-black leading-[1.14] tracking-[-0.03em] text-white md:text-[2.35rem]">
                  Generate the entire writing pack in one run.
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/60">
                  Create the core writing artifacts together, then save each output into the library.
                </p>
              </div>
              <span className="h-fit max-w-[19rem] rounded-lg border border-white/12 bg-white/8 px-4 py-2 text-left text-xs font-black uppercase leading-5 tracking-[0.12em] text-white/68">
                {kitStatus}
              </span>
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_19rem]">
              <label className="grid gap-3">
                <span className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-white/46">Instruction</span>
                <textarea
                  value={kitPrompt}
                  onChange={(event) => setKitPrompt(event.target.value)}
                  className="min-h-[14rem] resize-y rounded-lg border border-white/12 bg-white/8 px-4 py-4 text-sm leading-7 text-white outline-none transition placeholder:text-white/36 focus:border-[#6EA8FE]/55 focus:bg-white/10 focus:ring-4 focus:ring-[#6EA8FE]/10"
                />
              </label>

              <div className="grid gap-3">
                {launchKitDocuments.map((document) => (
                  <div key={document.title} className="rounded-lg border border-white/10 bg-white/8 p-4">
                    <strong className="block text-sm font-black leading-6 text-white">{document.title}</strong>
                    <span className="mt-3 block text-xs leading-5 text-white/52">{document.brief}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void runLaunchKit()}
                disabled={kitLoading || !kitPrompt.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-black text-[#111827] transition hover:-translate-y-0.5 hover:bg-[#F3F6FB] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
              >
                <SparkGlyph />
                {kitLoading ? "Generating..." : "Generate Kit"}
              </button>
              <button
                type="button"
                onClick={() => void saveLaunchKitDocuments()}
                disabled={savingKit || !kitDocuments.length}
                className="inline-flex items-center gap-2 rounded-lg border border-white/18 bg-white/8 px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:border-white/32 hover:bg-white/14 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
              >
                <DocumentGlyph />
                {savingKit ? "Saving..." : "Save All Outputs"}
              </button>
            </div>

            {kitDocuments.length ? (
              <div className="mt-7 grid gap-4 md:grid-cols-2">
                {kitDocuments.map((document) => (
                  <button
                    key={document.title}
                    type="button"
                    className="rounded-lg border border-white/10 bg-white/8 p-4 text-left transition hover:-translate-y-0.5 hover:bg-white/12"
                    onClick={() =>
                      navigate("/writing/new", {
                        state: {
                          contextIds: kitContextIds,
                          template: {
                            title: document.title,
                            content: document.content,
                          },
                        },
                      })
                    }
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-[#111827]">
                        <DocumentGlyph />
                      </span>
                      <span className="text-xs font-black uppercase tracking-[0.14em] text-white/46">Generated</span>
                    </div>
                    <strong className="mt-5 block font-[Bricolage_Grotesque] text-xl font-black leading-[1.12] tracking-[-0.025em] text-white">{document.title}</strong>
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-white/56">{document.summary}</p>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="[&_.context-builder-card]:!rounded-xl [&_.context-builder-card]:!border-[#DDE2EA] [&_.context-builder-card]:!bg-white/88 [&_.context-builder-card]:!p-6 [&_.context-builder-card]:!shadow-[0_18px_58px_rgba(15,23,42,0.07)] [&_.context-builder-head_h3]:!leading-[1.14]">
            <ContextBuilder selectedIds={kitContextIds} onChange={setKitContextIds} title="Launch Kit Context" />
          </div>
        </section>
      </motion.div>

      {docMenu ? (
        <div
          className="bc-context-menu"
          style={{ left: docMenu.x, top: docMenu.y }}
          onClick={(event) => event.stopPropagation()}
        >
          {(() => {
            const document = documents.find((item) => item.id === docMenu.documentId);
            if (!document) return null;

            if (docMenu.phase === "rename") {
              return (
                <>
                  <input
                    className="bc-context-menu-input"
                    value={docMenu.renameValue}
                    onChange={(e) => setDocMenu((m) => m ? { ...m, renameValue: e.target.value } : null)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleRenameDocument(document, docMenu.renameValue);
                      if (e.key === "Escape") setDocMenu((m) => m ? { ...m, phase: "default" } : null);
                    }}
                    autoFocus
                  />
                  <button className="bc-context-menu-item" type="button" onClick={() => void handleRenameDocument(document, docMenu.renameValue)}>
                    Save
                  </button>
                  <button className="bc-context-menu-item" type="button" onClick={() => setDocMenu((m) => m ? { ...m, phase: "default" } : null)}>
                    Cancel
                  </button>
                </>
              );
            }

            if (docMenu.phase === "confirm") {
              return (
                <>
                  <div className="bc-context-menu-label">Delete this document?</div>
                  <button className="bc-context-menu-item is-danger" type="button" onClick={() => void handleDeleteDocument(document)}>
                    Yes, delete
                  </button>
                  <button className="bc-context-menu-item" type="button" onClick={() => setDocMenu((m) => m ? { ...m, phase: "default" } : null)}>
                    Cancel
                  </button>
                </>
              );
            }

            return (
              <>
                <button className="bc-context-menu-item" type="button" onClick={() => navigate(`/writing/${document.id}`)}>
                  Edit
                </button>
                <button className="bc-context-menu-item" type="button" onClick={() => setDocMenu((m) => m ? { ...m, phase: "rename" } : null)}>
                  Rename
                </button>
                <button className="bc-context-menu-item is-danger" type="button" onClick={() => setDocMenu((m) => m ? { ...m, phase: "confirm" } : null)}>
                  Delete
                </button>
              </>
            );
          })()}
        </div>
      ) : null}
    </div>
  );
}
