import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function EmptyState({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center p-10 text-center">
        <div className="rounded-2xl bg-blue-50 p-4 text-blue-600">
          <Icon className="h-6 w-6" />
        </div>
        <p className="mt-4 text-base font-semibold text-slate-950">{title}</p>
        <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">{description}</p>
      </CardContent>
    </Card>
  );
}
