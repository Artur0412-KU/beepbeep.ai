"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase/client";

export type AuthMode = "sign-in" | "sign-up";

type AuthDialogProps = {
  open: boolean;
  initialMode: AuthMode;
  onOpenChange: (open: boolean) => void;
};

export function AuthDialog({
  open,
  initialMode,
  onOpenChange,
}: AuthDialogProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setError("");
      setNotice("");
    }
  }, [initialMode, open]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setIsSubmitting(true);

    const result =
      mode === "sign-in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setIsSubmitting(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }

    if (mode === "sign-up" && !result.data.session) {
      setNotice(
        "Your account was created. Check your email to confirm your account before signing in.",
      );
      return;
    }

    setEmail("");
    setPassword("");
    onOpenChange(false);
  };

  const toggleMode = () => {
    setMode((current) => (current === "sign-in" ? "sign-up" : "sign-in"));
    setError("");
    setNotice("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "sign-in" ? "Welcome back" : "Create your account"}
          </DialogTitle>
          <DialogDescription>
            {mode === "sign-in"
              ? "Sign in to your BeepBeep AI account."
              : "Create an account with your email and password."}
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="auth-email">Email</Label>
            <Input
              id="auth-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="auth-password">Password</Label>
            <Input
              id="auth-password"
              type="password"
              autoComplete={
                mode === "sign-in" ? "current-password" : "new-password"
              }
              minLength={6}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
            />
          </div>
          {error && (
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="text-sm text-[#66891a]" role="status">
              {notice}
            </p>
          )}
          <DialogFooter>
            <Button
              type="submit"
              className="w-full sm:w-auto"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Please wait..."
                : mode === "sign-in"
                  ? "Sign In"
                  : "Sign Up"}
            </Button>
          </DialogFooter>
        </form>
        <p className="text-center text-sm text-muted">
          {mode === "sign-in"
            ? "New to BeepBeep AI?"
            : "Already have an account?"}{" "}
          <button
            type="button"
            className="font-semibold text-ink underline underline-offset-4"
            onClick={toggleMode}
          >
            {mode === "sign-in" ? "Sign Up" : "Sign In"}
          </button>
        </p>
      </DialogContent>
    </Dialog>
  );
}
