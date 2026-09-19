"use client";

import type { FormEventHandler } from "react";
import { Loader2, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SearchFieldProps = {
  prompt: string;
  isSearching: boolean;
  error: string;
  onPromptChange: (value: string) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
};

export function SearchField({
  prompt,
  isSearching,
  error,
  onPromptChange,
  onSubmit,
}: SearchFieldProps) {
  return (
    <section
      className="my-6 rounded-2xl border border-border bg-card p-4 sm:p-5"
      aria-label="AI vehicle search"
    >
      <form
        className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"
        onSubmit={onSubmit}
      >
        <div className="grid gap-2">
          <Label htmlFor="vehicle-prompt">What are you looking for?</Label>
          <div className="relative">
            <Sparkles className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#66891a]" />
            <Input
              id="vehicle-prompt"
              value={prompt}
              onChange={(event) => onPromptChange(event.target.value)}
              placeholder="A hybrid SUV under $30,000 from 2021 or newer"
              className="h-12 pl-10"
            />
          </div>
        </div>
        <Button type="submit" className="h-12 gap-2" disabled={isSearching}>
          {isSearching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          {isSearching ? "Searching..." : "Search vehicles"}
        </Button>
      </form>
      <p className="mt-3 text-xs text-muted">
        Try details like make, model, budget, year, mileage, fuel type, body
        style, or features.
      </p>
      {error && (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
