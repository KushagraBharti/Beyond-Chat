import { Link } from "react-router-dom";

const sections = [
  ["Scope", "This draft describes the intended privacy approach for the Beyond Chat prototype. It is not a final privacy notice and should not be treated as a complete statement of current or future processing."],
  ["Information we may receive", "Depending on the flow you use, the prototype may receive account details, workspace content, files, prompts, generated outputs, run activity, and basic technical information needed to operate and protect the service."],
  ["How information is used", "Information may be used to provide requested features, maintain account and workspace state, troubleshoot failures, improve reliability, and protect the service. The product direction is to keep access scoped to the relevant user, project, and organization."],
  ["Providers and integrations", "The prototype has provider and integration scaffolding. Availability and processing arrangements are still being validated, so this draft does not promise that a particular provider, connector, region, retention period, or security control is active."],
  ["Retention and deletion", "Retention and deletion controls are still being designed. Do not submit sensitive or regulated information to the prototype unless you have confirmed that the current environment is appropriate for it."],
  ["Draft status", "This page is an honest product draft for review. It is not a final legal notice, does not create commitments beyond applicable law, and does not replace legal advice."],
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-stone-100 px-6 py-12 text-stone-900 sm:py-20">
      <article className="mx-auto max-w-3xl rounded-[2rem] border border-stone-200 bg-white p-8 shadow-[0_30px_80px_rgba(28,25,23,0.08)] sm:p-12">
        <Link to="/" className="text-sm font-semibold text-violet-700 hover:text-violet-900">← Beyond Chat</Link>
        <p className="mt-10 text-xs font-bold uppercase tracking-[0.24em] text-violet-700">Draft — not effective</p>
        <h1 className="mt-3 font-[Bricolage_Grotesque] text-4xl font-extrabold tracking-[-0.05em] sm:text-5xl">Privacy Notice</h1>
        <p className="mt-4 text-sm leading-6 text-stone-600">Product draft · Last updated July 11, 2026</p>
        <div className="mt-10 space-y-8">
          {sections.map(([title, copy]) => (
            <section key={title}>
              <h2 className="text-lg font-bold">{title}</h2>
              <p className="mt-2 text-sm leading-7 text-stone-600">{copy}</p>
            </section>
          ))}
        </div>
        <div className="mt-12 border-t border-stone-200 pt-6 text-sm text-stone-600">
          See also <Link to="/terms" className="font-semibold text-violet-700 hover:text-violet-900">the Terms draft</Link>.
        </div>
      </article>
    </main>
  );
}
