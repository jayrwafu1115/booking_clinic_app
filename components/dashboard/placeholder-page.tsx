import { Card, CardContent } from "@/components/ui/card";

export function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">Book Clinic PH</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">{title}</h1>
      </div>
      <Card>
        <CardContent className="p-6 text-sm leading-6 text-slate-600">{description}</CardContent>
      </Card>
    </div>
  );
}
