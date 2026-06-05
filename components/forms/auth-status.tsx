"use client";

export function AuthStatus({ message, success }: { message?: string; success?: boolean }) {
  if (!message) {
    return null;
  }

  return (
    <p className={success ? "rounded-xl bg-blue-50 p-3 text-sm text-blue-700" : "rounded-xl bg-red-50 p-3 text-sm text-red-700"}>
      {message}
    </p>
  );
}
