import Link from "next/link";
import { ForgotPasswordForm } from "@/components/forms/forgot-password-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ForgotPasswordPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Reset password</CardTitle>
        <CardDescription>We will send a secure reset link to your email.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <ForgotPasswordForm />
        <p className="text-center text-sm text-slate-600">
          Remembered it?{" "}
          <Link className="font-semibold text-blue-600 hover:text-blue-700" href="/login">
            Back to sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
