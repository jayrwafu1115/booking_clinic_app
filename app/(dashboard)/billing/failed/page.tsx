import Link from "next/link";
import { redirect } from "next/navigation";
import { XCircle } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth/session";

export default async function BillingFailedPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex justify-center">
          <XCircle className="h-16 w-16 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Payment Failed</h1>
        <p className="mt-3 text-slate-600">
          Your payment could not be processed. Please check your card details or try a different payment method.
        </p>
        <p className="mt-2 text-sm text-slate-400">
          If this issue persists, contact{" "}
          <a href="mailto:support@bookclinicph.com" className="text-blue-600 hover:underline">
            support@bookclinicph.com
          </a>
          .
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/billing"
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Try Again
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-xl bg-slate-100 px-6 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
