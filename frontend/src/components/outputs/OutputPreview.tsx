import type { OutputView } from "../../features/outputs/model";

export function OutputPreview({ output }: { readonly output: OutputView }) {
  if (output.capability === "unsupported") return <div className="output-state" role="status"><strong>Preview unavailable</strong><p>{output.capabilityMessage}</p></div>;
  const preview = output.preview;
  if (preview.kind === "document") return <article className="output-document">{preview.blocks.map((block) => block.type === "heading" ? <h2 key={block.id}>{block.text}</h2> : <p key={block.id}>{block.text}</p>)}</article>;
  if (preview.kind === "spreadsheet") return <div className="output-table-wrap"><table><thead><tr>{preview.columns.map((column) => <th key={column} scope="col">{column}</th>)}</tr></thead><tbody>{preview.rows.map((row, rowIndex) => <tr key={`row-${rowIndex}`}>{preview.columns.map((column) => <td key={column}>{row[column] ?? "—"}</td>)}</tr>)}</tbody></table></div>;
  if (preview.kind === "presentation") return <ol className="output-slides">{preview.slides.map((slide, index) => <li key={slide.id}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{slide.title}</strong><p>{slide.summary}</p></div></li>)}</ol>;
  if (preview.kind === "data_chart") { const maximum = Math.max(...preview.points.map((point) => point.value), 1); return <figure className="output-chart"><figcaption>{preview.chartType} chart preview</figcaption>{preview.points.map((point) => <div key={point.label} className="output-chart-row"><span>{point.label}</span><div><i style={{ transform: `scaleX(${point.value / maximum})` }} /></div><strong>{point.value}</strong></div>)}</figure>; }
  return <figure className="output-image"><img src={preview.src} alt={preview.alt} width={preview.width} height={preview.height} /><figcaption>{preview.alt}</figcaption></figure>;
}
