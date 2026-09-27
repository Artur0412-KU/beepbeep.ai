import { z } from "zod";
import type { Listing } from "@/features/listings/types";

export const searchContextSchema = z.object({
  extracted_make_model: z.string().nullable(),
  price_max: z.number().nullable(),
  year_min: z.number().nullable(),
  mileage_max: z.number().nullable(),
  fuel_type: z.string().nullable(),
  body_type: z.string().nullable(),
  parsed_features: z.array(z.string()),
  location: z.string().nullable(),
});

export type SearchContext = z.infer<typeof searchContextSchema>;

export function parseSearchContext(value: string) {
  return searchContextSchema.parse(JSON.parse(value)) as SearchContext;
}

const normalize = (value: string) =>
  value.toLowerCase().replace(/[_-]/g, " ").replace(/\s+/g, " ").trim();

export function matchesSearchContext(
  listing: Listing,
  filters: SearchContext,
) {
  const vehicleName = normalize(`${listing.brand} ${listing.model}`);
  const requestedVehicle = filters.extracted_make_model
    ? normalize(filters.extracted_make_model)
    : "";
  const requestedFeatures = filters.parsed_features.map(normalize);
  const listingFeatures = listing.features.map(normalize);

  return (
    (!requestedVehicle ||
      vehicleName.includes(requestedVehicle) ||
      requestedVehicle.includes(vehicleName)) &&
    (filters.price_max === null || listing.price <= filters.price_max) &&
    (filters.year_min === null || listing.year >= filters.year_min) &&
    (filters.mileage_max === null || listing.mileage <= filters.mileage_max) &&
    (!filters.fuel_type ||
      normalize(listing.fuel_type) === normalize(filters.fuel_type)) &&
    (!filters.body_type ||
      normalize(listing.body_type) === normalize(filters.body_type)) &&
    (!filters.location ||
      normalize(listing.origin).includes(normalize(filters.location))) &&
    requestedFeatures.every((requestedFeature) =>
      listingFeatures.some(
        (feature) =>
          feature.includes(requestedFeature) ||
          requestedFeature.includes(feature),
      ),
    )
  );
}
