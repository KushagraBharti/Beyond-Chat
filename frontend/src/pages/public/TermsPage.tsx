import { Link } from "react-router-dom";

const sections = [
  ["Service status", "Beyond Chat is currently a transitional prototype. Features, availability, integrations, and pricing may change while the product is rebuilt. No paid plan is currently offered through this site."],
  ["Accounts", "You are responsible for the information used to create your account and for keeping account access secure. Do not use the service to violate applicable law or another person's rights."],
  ["Your content", "You retain responsibility for the content, files, instructions, and other material you provide. You should not submit information that you are not authorized to share."],
  ["Outputs and review", "AI-generated outputs may be incomplete or incorrect. Review outputs before relying on them, sharing them, or using them in consequential decisions."],
  ["Billing", "The initial commercial target is $30 per user per month, but that is a planning target rather than an active offer. Any future billing terms will be presented before a paid subscription is enabled."],
  ["Draft status", "This page is an honest product draft for review. It is not a final agreement, does not create a binding contract, and does not replace legal advice."],
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-stone-100 px-6 py-12 text-stone-900 sm:py-20">
      <article className="mx-auto max-w-3xl rounded-[2rem] border border-stone-200 bg-white p-8 shadow-[0_30px_80px_rgba(28,25,23,0.08)] sm:p-12">
        <Link to="/" className="text-sm font-semibold text-violet-700 hover:text-violet-900">← Beyond Chat</Link>
        <p className="mt-10 text-xs font-bold uppercase tracking-[0.24em] text-violet-700">Draft — not effective</p>
        <h1 className="mt-3 font-[Bricolage_Grotesque] text-4xl font-extrabold tracking-[-0.05em] sm:text-5xl">Terms of Service</h1>
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
          See also <Link to="/privacy" className="font-semibold text-violet-700 hover:text-violet-900">the Privacy Notice draft</Link>.
        </div>
      </article>
    </main>
  );
}
