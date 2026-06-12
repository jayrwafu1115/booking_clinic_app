import { ChevronDown } from "lucide-react";
import type { PublicClinicFaq } from "@/server/queries/public";

type ClinicFaqProps = {
  faqs: PublicClinicFaq[];
};

export function ClinicFaq({ faqs }: ClinicFaqProps) {
  if (faqs.length === 0) return null;

  return (
    <section id="faq" className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-4xl scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-900">Frequently Asked Questions</h2>
          <p className="mt-3 text-base leading-7 text-slate-600">
            Quick answers to the things patients ask us most.
          </p>
        </div>

        <div className="mt-10 space-y-3">
          {faqs.map((faq) => (
            <details
              key={faq.id}
              className="group rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 open:bg-white open:shadow-sm"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
                {faq.question}
                <ChevronDown
                  className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600">{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
