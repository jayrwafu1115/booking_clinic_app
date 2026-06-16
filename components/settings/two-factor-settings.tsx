"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, ShieldOff, Loader2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type MfaFactor = { id: string; friendly_name: string; factor_type: string; status: string };

export function TwoFactorSettings() {
  const [factors, setFactors] = useState<MfaFactor[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const supabase = createSupabaseBrowserClient();

  async function loadFactors() {
    setLoading(true);
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors((data?.totp ?? []) as MfaFactor[]);
    setLoading(false);
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void loadFactors(); }, []);

  async function startEnrollment() {
    setError(""); setSuccess("");
    const { data, error: err } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Authenticator" });
    if (err || !data) { setError(err?.message ?? "Enrollment failed."); return; }
    const totp = (data as { totp?: { qr_code?: string; secret?: string } }).totp;
    const sec = totp?.secret ?? "";
    const fid = data.id;
    // Supabase returns the QR code as a data URI ready for use in <img>
    const dataUrl = totp?.qr_code ?? "";
    setQrDataUrl(dataUrl);
    setSecret(sec);
    setFactorId(fid);
    setEnrolling(true);
  }

  async function verifyAndActivate() {
    if (!factorId) return;
    setError("");
    const { data: challengeData, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeErr || !challengeData) { setError(challengeErr?.message ?? "Challenge failed."); return; }
    const { error: verifyErr } = await supabase.auth.mfa.verify({ factorId, challengeId: challengeData.id, code });
    if (verifyErr) { setError(verifyErr.message); return; }
    setSuccess("Two-factor authentication enabled successfully.");
    setEnrolling(false); setQrDataUrl(null); setSecret(null); setFactorId(null); setCode("");
    await loadFactors();
  }

  async function unenroll(fid: string) {
    setError(""); setSuccess("");
    const { error: err } = await supabase.auth.mfa.unenroll({ factorId: fid });
    if (err) { setError(err.message); return; }
    setSuccess("Two-factor authentication disabled.");
    await loadFactors();
  }

  const activeFactor = factors.find((f) => f.status === "verified");

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {activeFactor ? (
            <ShieldCheck className="h-5 w-5 text-green-600" />
          ) : (
            <ShieldOff className="h-5 w-5 text-slate-400" />
          )}
          Two-Factor Authentication (2FA)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : activeFactor ? (
          <div className="space-y-4">
            <div className="rounded-xl bg-green-50 p-4">
              <p className="text-sm font-semibold text-green-800">2FA is enabled</p>
              <p className="text-xs text-green-700 mt-1">
                Your account is protected with an authenticator app. Disable if you need to re-enroll.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={() => unenroll(activeFactor.id)}
            >
              Disable 2FA
            </Button>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {success && <p className="text-sm text-green-700">{success}</p>}
          </div>
        ) : enrolling && qrDataUrl ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.), then enter the 6-digit code below.
            </p>
            {qrDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrDataUrl} alt="2FA QR Code" className="mx-auto h-44 w-44 rounded-lg border border-slate-200" />
            )}
            {secret && (
              <p className="rounded bg-slate-100 px-3 py-2 text-center font-mono text-xs text-slate-700 break-all">
                Manual key: {secret}
              </p>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="totp-code">Verification code</Label>
              <Input
                id="totp-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                inputMode="numeric"
                autoComplete="one-time-code"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={verifyAndActivate} disabled={code.length < 6} className="flex-1">
                Activate 2FA
              </Button>
              <Button variant="outline" onClick={() => { setEnrolling(false); setQrDataUrl(null); }}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Add an extra layer of security to your account. Once enabled, you&apos;ll need a code from your authenticator app each time you sign in.
            </p>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {success && <p className="text-sm text-green-700">{success}</p>}
            <Button onClick={startEnrollment}>Enable Two-Factor Authentication</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
