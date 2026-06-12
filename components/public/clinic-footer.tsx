import { SocialLinks } from "@/components/public/social-links";
import { APP_NAME } from "@/lib/constants/app";
import type { PublicClinicSite } from "@/server/queries/public";

type ClinicFooterProps = {
  clinic: PublicClinicSite["clinic"];
};

export function ClinicFooter({ clinic }: ClinicFooterProps) {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:px-6">
        <p className="font-medium text-slate-700">{clinic.name}</p>
        <SocialLinks clinic={clinic} />
        <p>
          Powered by <span className="font-semibold text-slate-700">{APP_NAME}</span>
        </p>
      </div>
    </footer>
  );
}
