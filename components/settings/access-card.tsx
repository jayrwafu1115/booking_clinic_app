import { Card, CardContent } from "@/components/ui/card";

export function AccessCard({ title, message }: { title: string; message: string }) {
  return (
    <Card>
      <CardContent className="p-6">
        <p className="text-base font-semibold text-slate-950">{title}</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">{message}</p>
      </CardContent>
    </Card>
  );
}
