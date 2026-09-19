import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import listings from "@/features/listings/data/listing-dataset.json";
import { AuthHeader } from "@/features/auth/components/auth-header";
import { ListingCarousel } from "@/features/listings/components/listing-carousel";
import { WishlistButton } from "@/features/wishlist/components/wishlist-button";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import type { Listing } from "@/features/listings/types";

const formatPrice = (price: number, currency: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(price);

export default function ListingPage({
  params,
}: {
  params: { listingId: string };
}) {
  const listing = (listings as Listing[]).find(
    (item) => item.listing_id === params.listingId,
  );
  if (!listing) notFound();

  return (
    <main className="mx-auto max-w-[1240px] px-4 py-4 sm:px-7 sm:py-8">
      <AuthHeader />
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Back to search
      </Link>
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <ListingCarousel
          images={listing.img_array}
          alt={`${listing.brand} ${listing.model}`}
        />
        <Card className="border-border bg-card">
          <CardContent className="p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Badge variant="secondary" className="mb-3 capitalize">
                  {listing.body_type}
                </Badge>
                <p className="text-sm text-muted">
                  {listing.year} · {listing.origin}
                </p>
                <h1 className="mt-2 font-display text-4xl font-bold tracking-[-0.05em]">
                  {listing.brand} {listing.model}
                </h1>
              </div>
              <WishlistButton listingId={listing.listing_id} />
            </div>
            <p className="mt-6 font-display text-3xl font-semibold">
              {formatPrice(listing.price, listing.currency)}
            </p>
            <div className="my-6 grid grid-cols-2 gap-3 border-y border-border py-5 text-sm">
              <div>
                <span className="block text-xs uppercase tracking-wide text-muted">
                  Mileage
                </span>
                <strong>{listing.mileage.toLocaleString()} mi</strong>
              </div>
              <div>
                <span className="block text-xs uppercase tracking-wide text-muted">
                  Fuel type
                </span>
                <strong className="capitalize">{listing.fuel_type}</strong>
              </div>
              <div>
                <span className="block text-xs uppercase tracking-wide text-muted">
                  Body type
                </span>
                <strong className="capitalize">{listing.body_type}</strong>
              </div>
              <div>
                <span className="block text-xs uppercase tracking-wide text-muted">
                  Origin
                </span>
                <strong>{listing.origin}</strong>
              </div>
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold">Features</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {listing.features.map((feature) => (
                  <Badge key={feature}>{feature.replaceAll("_", " ")}</Badge>
                ))}
              </div>
            </div>
            <a
              href={listing.navigate_link}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                buttonVariants({ size: "lg" }),
                "mt-8 w-full gap-2",
              )}
            >
              Navigate to listing <ArrowUpRight className="h-4 w-4" />
            </a>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
