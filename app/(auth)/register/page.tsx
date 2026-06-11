import Link from "next/link";
import { AcceptInviteForm } from "@/components/forms/accept-invite-form";
import { RegisterForm } from "@/components/forms/register-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const token = params.token;
  const email = params.email;

  if (token && email) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Accept your invitation</CardTitle>
          <CardDescription>Create a password to join your clinic on ClinicFlow AI PH.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <AcceptInviteForm token={token} email={decodeURIComponent(email)} />
          <p className="text-center text-sm text-slate-600">
            Already have an account?{" "}
            <Link className="font-semibold text-blue-600 hover:text-blue-700" href="/login">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your clinic workspace</CardTitle>
        <CardDescription>Includes a PHP 0 free trial and no payment method requirement.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <RegisterForm />
        <p className="text-center text-sm text-slate-600">
          Already registered?{" "}
          <Link className="font-semibold text-blue-600 hover:text-blue-700" href="/login">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
