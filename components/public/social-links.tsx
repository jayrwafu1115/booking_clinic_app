import { Facebook, Instagram, Music2, Youtube } from "lucide-react";
import type { PublicClinicSite } from "@/server/queries/public";

type SocialLinksProps = {
  clinic: PublicClinicSite["clinic"];
  className?: string;
};

export function SocialLinks({ clinic, className }: SocialLinksProps) {
  const links = [
    { href: clinic.facebook_url, label: "Facebook", Icon: Facebook },
    { href: clinic.instagram_url, label: "Instagram", Icon: Instagram },
    { href: clinic.tiktok_url, label: "TikTok", Icon: Music2 },
    { href: clinic.youtube_url, label: "YouTube", Icon: Youtube }
  ].filter((link): link is { href: string; label: string; Icon: typeof Facebook } => Boolean(link.href));

  if (links.length === 0) return null;

  return (
    <div className={className ?? "flex items-center gap-2"}>
      {links.map(({ href, label, Icon }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noreferrer"
          aria-label={`${clinic.name} on ${label}`}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-[var(--brand)] hover:text-white"
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </a>
      ))}
    </div>
  );
}
