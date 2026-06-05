import Link from "next/link";
import { LoginForm } from "@/components/forms/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Access your clinic dashboard.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <LoginForm />
        <p className="text-center text-sm text-slate-600">
          New clinic?{" "}
          <Link className="font-semibold text-blue-600 hover:text-blue-700" href="/register">
            Create an account
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
