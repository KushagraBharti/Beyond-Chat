import type { CollaboratorView, RunProgressView } from "../../features/collaboration/model";

export function PresenceStrip({ collaborators, progress }: { readonly collaborators: readonly CollaboratorView[]; readonly progress: RunProgressView | null }) {
  return <aside className="presence-strip" aria-label="Live project activity"><ul aria-label="Collaborators">{collaborators.map((person) => <li key={person.id} title={`${person.name} · ${person.location}`} data-state={person.state}><span aria-hidden="true">{person.initials}</span><span className="sr-only">{person.name}, {person.state}, {person.location}</span></li>)}</ul>{progress ? <div className="run-progress"><div><strong>{progress.label}</strong><span>{progress.completedSteps} of {progress.totalSteps}</span></div><progress value={progress.completedSteps} max={Math.max(progress.totalSteps, 1)} aria-label={`${progress.label} progress`} /></div> : <span>No run in progress</span>}</aside>;
}
