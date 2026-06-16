"use client";

import { useActionState } from "react";
import { UserPlus } from "lucide-react";
import { joinWaitlistAction } from "@/server/actions/waitlist";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function AddToWaitlistForm() {
  const [state, action, pending] = useActionState(joinWaitlistAction, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserPlus className="h-4 w-4 text-blue-600" />
          Add to Waitlist
        </CardTitle>
      </CardHeader>
      <CardContent>
        {state.success ? (
          <div className="rounded-xl bg-green-50 p-4 text-sm font-medium text-green-800">
            Patient added to waitlist.
          </div>
        ) : (
          <form action={action} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="wl-name">Patient name *</Label>
              <Input id="wl-name" name="patient_name" placeholder="Juan Dela Cruz" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wl-phone">Mobile number *</Label>
              <Input id="wl-phone" name="patient_phone" placeholder="09XXXXXXXXX" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wl-email">Email (optional)</Label>
              <Input id="wl-email" name="patient_email" type="email" placeholder="juan@email.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wl-date">Preferred date (optional)</Label>
              <Input id="wl-date" name="preferred_date" type="date" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wl-notes">Notes (optional)</Label>
              <Textarea id="wl-notes" name="notes" placeholder="Any special requests or notes..." rows={2} />
            </div>
            {state.message && (
              <p className="text-sm text-red-600">{state.message}</p>
            )}
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Adding..." : "Add to Waitlist"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
