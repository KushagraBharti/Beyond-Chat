import { capabilityLabel, OUTPUT_CAPABILITIES } from "../../features/outputs/capabilities";
import type { OutputActions, OutputView } from "../../features/outputs/model";
import { OutputPreview } from "./OutputPreview";
import { VersionTimeline } from "./VersionTimeline";
import "./output-workbench.css";

export function OutputWorkbench({ output, actions }: { readonly output: OutputView; readonly actions: OutputActions }) {
  const capabilities = OUTPUT_CAPABILITIES[output.kind];
  return <main className="output-workbench"><header className="output-header"><div><p>{output.kind.replace("_", " ")} · {output.lifecycle.replaceAll("_", " ")}</p><h1>{output.title}</h1></div><dl><div><dt>View</dt><dd>{capabilityLabel(capabilities.view)}</dd></div><div><dt>Edit</dt><dd>{capabilityLabel(capabilities.edit)}</dd></div><div><dt>Diff</dt><dd>{capabilityLabel(capabilities.diff)}</dd></div></dl></header><div className="output-layout"><section className="output-canvas" aria-label={`${output.title} preview`}><OutputPreview output={output} />{output.capability !== "supported" ? <aside className="output-capability-note" role="note">{output.capabilityMessage}</aside> : null}<section className="output-validation" aria-labelledby="validation-heading"><h2 id="validation-heading">Validation</h2>{output.validation.length === 0 ? <p>No validation result yet.</p> : <ul>{output.validation.map((check) => <li key={check.code} data-status={check.status}><strong>{check.code}</strong><span>{check.message}</span></li>)}</ul>}</section></section><VersionTimeline versions={output.versions} activeVersionId={output.activeVersionId} actions={actions} /></div></main>;
}
