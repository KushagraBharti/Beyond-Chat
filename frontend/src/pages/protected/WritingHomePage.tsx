import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listArtifacts, type ArtifactRecord } from "../../lib/api";
import { fadeUp, studioColors } from "../../lib/theme";
import {
  EmptyState,
  MotionCard,
  PageSection,
  PrimaryButton,
  SecondaryButton,
  StatusBadge,
  TextInput,
} from "../../components/protectedUi";

export default function WritingHomePage() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<ArtifactRecord[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const response = await listArtifacts({ studio: "writing", q: query, limit: 24 });
        if (active) {
          setDocuments(response.items);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load writing library.");
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [query]);

  return (
    <div className="page-wrap">
      <PageSection
        eyebrow="Writing Studio"
        title="Document workspace"
        description="A Google Docs-like library surface with a Start New action at the top and a grid of recent writing artifacts below."
        actions={
          <div className="inline-actions">
            <PrimaryButton type="button" onClick={() => navigate("/writing/new")}>
              Start New
            </PrimaryButton>
            <SecondaryButton type="button">Import Existing Draft</SecondaryButton>
          </div>
        }
      />

      {error ? <div className="error-copy">{error}</div> : null}

      <motion.div variants={fadeUp}>
        <MotionCard accent={studioColors.writing} className="writing-launch-card">
          <div className="writing-launch-copy">
            <span className="page-eyebrow">Document Library</span>
            <h2>Start from a blank page, reopen essays, and keep AI edits inside the same document system.</h2>
            <p>
              The library view is the entry point. The editor is a separate route designed for real drafting, formatting,
              and inline assistant actions.
            </p>
          </div>
          <div className="writing-launch-preview">
            <div className="writing-mini-toolbar">
              <span>Font size</span>
              <span>Color</span>
              <span>Headers</span>
              <span>Lists</span>
            </div>
            <div className="writing-mini-paper">
              <div />
              <div />
              <div />
              <div />
            </div>
          </div>
        </MotionCard>
      </motion.div>

      <MotionCard>
        <div className="context-builder-head">
          <div>
            <h3>Recent documents</h3>
            <p>Searchable writing artifacts ready to reopen.</p>
          </div>
          <StatusBadge status="connected" label={`${documents.length} docs`} />
        </div>
        <TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search documents..." />
      </MotionCard>

      {documents.length ? (
        <div className="document-grid">
          {documents.map((document) => (
            <button key={document.id} className="document-card" onClick={() => navigate(`/writing/${document.id}`)} type="button">
              <div className="document-card-top">
                <StatusBadge status="connected" label={document.contentFormat} />
                <span>{new Date(document.updated_at).toLocaleDateString()}</span>
              </div>
              <strong>{document.title}</strong>
              <p>{document.summary ?? document.content.slice(0, 180)}</p>
              <div className="document-card-tags">
                {document.tags.map((tag) => (
                  <span key={tag}>#{tag}</span>
                ))}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No writing artifacts found"
          body="Create a new document or clear the current search to see your saved drafts."
          action={
            <PrimaryButton type="button" onClick={() => navigate("/writing/new")}>
              Create first document
            </PrimaryButton>
          }
        />
      )}
    </div>
  );
}
