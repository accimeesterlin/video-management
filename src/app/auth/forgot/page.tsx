"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, ArrowLeft, Building2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/password/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Unable to send reset email");
      }

      setSubmitted(true);
      toast.success(data.message || "Check your inbox for password reset instructions.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to send reset email";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <Card className="max-w-md w-full">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto h-12 w-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="text-2xl font-semibold text-gray-900">
            Reset your password
          </CardTitle>
          <p className="text-sm text-gray-500">
            Enter the email linked to your account and we'll send you a link to set a new password.
          </p>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <div className="space-y-4 text-sm text-gray-600">
              <p>
                If an account exists for <strong>{email}</strong>, you'll receive an email with a password reset link.
              </p>
              <p className="text-xs text-gray-500">
                The link is valid for one hour. Be sure to check your spam folder if it doesn't arrive soon.
              </p>
              <Button className="w-full" onClick={() => router.push("/auth/signin")}>Back to sign in</Button>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    className="pl-9"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending instructions..." : "Send reset link"}
              </Button>

              <button
                type="button"
                onClick={() => router.push("/auth/signin")}
                className="flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-700 w-full"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
