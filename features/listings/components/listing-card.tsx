import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { WishlistButton } from "@/features/wishlist/components/wishlist-button";
import type { Listing } from "@/features/listings/types";
import { translateBodyType } from "@/features/listings/labels";

const formatPrice = (price: number, currency: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(price);

export function ListingCard({ listing }: { listing: Listing }) {
  const image = listing.img_array[0];

  return (
    <Card className="overflow-hidden border-border bg-card">
      <div className="relative flex h-[180px] items-center justify-center bg-[#dce9d9]">
        {image ? (
          <img
            src={image}
            alt={`${listing.brand} ${listing.model}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-[118px] w-[118px] items-center justify-center rounded-full bg-ink font-display text-[78px] font-bold leading-none text-accent">
            {listing.brand.slice(0, 1)}
          </div>
        )}
        <Badge
          variant="secondary"
          className="absolute left-3.5 top-3.5 capitalize"
        >
          {translateBodyType(listing.body_type)}
        </Badge>
      </div>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="mb-1 text-xs text-muted">
              {listing.year} · {listing.origin}
            </p>
            <Link
              href={`/listing/${listing.listing_id}`}
              className="font-display text-[22px] font-semibold tracking-[-0.04em] hover:text-[#66891a]"
            >
              {listing.brand} {listing.model}
            </Link>
          </div>
          <strong className="whitespace-nowrap text-[17px]">
            {formatPrice(listing.price, listing.currency)}
          </strong>
        </div>
        <div className="flex w-1/4 flex-col items-start">
          <WishlistButton listingId={listing.listing_id} />
          <Link
            href={`/listing/${listing.listing_id}`}
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "mt-4 h-auto gap-2 px-0 py-0 text-ink hover:bg-transparent hover:text-ink",
            )}
          >
            View details <ArrowUpRight className="h-4 w-4 text-[#66891a]" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
