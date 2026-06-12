import Link from "next/link";
import { redirect } from "next/navigation";
import { XCircle } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth/session";

export default async function BillingCancelledPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex justify-center">
          <XCircle className="h-16 w-16 text-slate-400" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Payment Cancelled</h1>
        <p className="mt-3 text-slate-600">
          Your payment was cancelled. No charges were made. You can try again anytime from the billing page.
        </p>
        <div className="mt-8">
          <Link
            href="/billing"
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Back to Billing
          </Link>
        </div>
      </div>
    </div>
  );
}
