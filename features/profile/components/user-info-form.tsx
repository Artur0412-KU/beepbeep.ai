"use client";

import { FormEvent, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Loader2, Save } from "lucide-react";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase/client";

export function UserInfoForm({ user }: { user: User }) {
  const { refreshUser } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [location, setLocation] = useState("");
  const [email, setEmail] = useState(user.email ?? "");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let mounted = true;
    setEmail(user.email ?? "");

    supabase
      .from("User")
      .select("name, phone, age, location")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data, error: profileError }) => {
        if (!mounted) return;
        if (profileError) setError(profileError.message);
        setName(data?.name ?? "");
        setPhone(data?.phone ?? "");
        setAge(
          data?.age === null || data?.age === undefined
            ? ""
            : String(data.age),
        );
        setLocation(data?.location ?? "");
        setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [user]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSaving(true);

    const parsedAge = age.trim() === "" ? null : Number(age);
    if (
      parsedAge !== null &&
      (!Number.isInteger(parsedAge) || parsedAge < 0 || parsedAge > 150)
    ) {
      setError("Age must be a whole number between 0 and 150.");
      setIsSaving(false);
      return;
    }

    const { error: profileError } = await supabase.from("User").upsert({
      id: user.id,
      name: name.trim() || null,
      phone: phone.trim() || null,
      age: parsedAge,
      location: location.trim() || null,
      updated_at: new Date().toISOString(),
    });

    if (profileError) {
      setError(profileError.message);
      setIsSaving(false);
      return;
    }

    const currentEmail = user.email ?? "";
    if (email.trim() && email.trim() !== currentEmail) {
      const { error: emailError } = await supabase.auth.updateUser({
        email: email.trim(),
      });
      if (emailError) {
        setError(emailError.message);
        setIsSaving(false);
        return;
      }
    }

    await refreshUser();
    setSuccess("Your profile has been updated.");
    setIsSaving(false);
  };

  return (
    <Card className="mx-auto max-w-2xl border-border bg-card">
      <CardContent className="p-6 sm:p-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading details...
          </div>
        ) : (
          <form className="grid gap-5" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="profile-name">Name</Label>
              <Input
                id="profile-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your name"
                autoComplete="name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="profile-phone">Phone</Label>
              <Input
                id="profile-phone"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+1 555 123 4567"
                autoComplete="tel"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="profile-age">Age</Label>
              <Input
                id="profile-age"
                type="number"
                min="0"
                max="150"
                step="1"
                value={age}
                onChange={(event) => setAge(event.target.value)}
                placeholder="30"
                autoComplete="off"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="profile-location">Location</Label>
              <Input
                id="profile-location"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="Kyiv, Ukraine"
                autoComplete="address-level2"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="profile-email">Email</Label>
              <Input
                id="profile-email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
            {error && (
              <p className="text-sm text-red-700" role="alert">
                {error}
              </p>
            )}
            {success && (
              <p className="text-sm text-[#66891a]" role="status">
                {success}
              </p>
            )}
            <Button
              type="submit"
              className="mt-2 w-full gap-2 sm:w-fit"
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isSaving ? "Saving..." : "Save changes"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
