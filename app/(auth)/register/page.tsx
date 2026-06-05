import Link from "next/link";
import { RegisterForm } from "@/components/forms/register-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function RegisterPage() {
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
