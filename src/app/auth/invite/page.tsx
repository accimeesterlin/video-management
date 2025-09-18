"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, Mail, User, CheckCircle2 } from "lucide-react";

interface InviteInfo {
  email: string;
  name: string;
  needsPasswordReset: boolean;
  companyName: string;
}

function InviteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    const fetchInvite = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/auth/invite/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          toast.error(error.message || "This invite link is no longer valid.");
          router.replace("/auth/signin");
          return;
        }

        const data = (await response.json()) as InviteInfo;
        setInviteInfo(data);
        setName(data.name || "");
      } catch (error) {
        console.error("Failed to verify invite:", error);
        toast.error("Unable to verify invitation. Please request a new invite.");
        router.replace("/auth/signin");
      } finally {
        setLoading(false);
      }
    };

    fetchInvite();
  }, [token, router]);

  const handleAcceptInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!inviteInfo) return;

    if (inviteInfo.needsPasswordReset) {
      if (!password || password.length < 8) {
        toast.error("Please choose a password with at least 8 characters.");
        return;
      }
      if (password !== confirmPassword) {
        toast.error("Passwords do not match");
        return;
      }
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          name,
          password: inviteInfo.needsPasswordReset ? password : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || "Failed to accept invitation");
      }

      toast.success("You're all set! Redirecting to the dashboard...");
      setAccepted(true);

      if (inviteInfo.needsPasswordReset && password) {
        const signInResult = await signIn("credentials", {
          email: inviteInfo.email,
          password,
          redirect: false,
        });

        if (signInResult?.ok) {
          router.replace("/dashboard");
          return;
        }
      }

      router.replace("/auth/signin");
    } catch (error) {
      console.error("Failed to accept invite:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to complete invitation. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!inviteInfo) {
    return null;
  }

  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="mx-auto h-12 w-12 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <CardTitle className="mt-4">Invitation accepted</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              Welcome to the {inviteInfo.companyName || "team"}! Redirecting you to get started...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <Card className="max-w-lg w-full">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-2xl font-semibold text-gray-900">
            Join {inviteInfo.companyName || "the team"}
          </CardTitle>
          <p className="text-sm text-gray-500">
            Complete your account setup to begin collaborating.
          </p>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleAcceptInvite}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input value={inviteInfo.email} readOnly className="pl-9 bg-gray-100" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full name
                </label>
                <div className="relative">
                  <User className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                    placeholder="Your name"
                    className="pl-9"
                  />
                </div>
              </div>

              <div>
                {inviteInfo.needsPasswordReset ? (
                  <>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Create password
                    </label>
                    <div className="space-y-3">
                      <div className="relative">
                        <Lock className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <Input
                          type="password"
                          placeholder="New password"
                          className="pl-9"
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          minLength={8}
                          required
                        />
                      </div>
                      <div className="relative">
                        <Lock className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <Input
                          type="password"
                          placeholder="Confirm password"
                          className="pl-9"
                          value={confirmPassword}
                          onChange={(event) => setConfirmPassword(event.target.value)}
                          minLength={8}
                          required
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Password must be at least 8 characters long.
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-600 bg-blue-50 border border-blue-100 rounded-lg p-3">
                    You're almost there! Confirm your details and we'll activate your access.
                  </p>
                )}
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Setting up..." : "Join workspace"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    }>
      <InviteForm />
    </Suspense>
  );
}
