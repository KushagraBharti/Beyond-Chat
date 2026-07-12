import { Link } from "react-router-dom";

export default function BillingSuccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-100 px-6">
      <div className="w-full max-w-lg rounded-[2rem] border border-stone-200 bg-white p-8 text-center shadow-[0_30px_80px_rgba(28,25,23,0.08)]">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600 text-2xl font-black text-white">
          P
        </div>
        <h1 className="font-[Bricolage_Grotesque] text-4xl font-extrabold tracking-[-0.05em] text-stone-950">
          Billing return received
        </h1>
        <p className="mt-3 text-sm leading-6 text-stone-600">
          This page does not confirm a subscription or grant access. Beyond Chat updates billing status only after the server verifies the payment result and webhook.
        </p>
        <Link
          to="/dashboard"
          className="mt-8 inline-flex rounded-2xl bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-stone-800"
        >
          Return to dashboard
        </Link>
        <p className="mt-4 text-xs text-stone-500">Check Settings for the verified account status.</p>
      </div>
    </div>
  );
}
