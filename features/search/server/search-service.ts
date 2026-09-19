import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import listings from "@/features/listings/data/listing-dataset.json";

const searchContextSchema = z.object({
  extracted_make_model: z.string().nullable(),
  price_max: z.number().nullable(),
  year_min: z.number().nullable(),
  mileage_max: z.number().nullable(),
  fuel_type: z.string().nullable(),
  body_type: z.string().nullable(),
  parsed_features: z.array(z.string()),
  location: z.string().nullable()
});

const searchContextJsonSchema = {
  type: "object",
  properties: {
    extracted_make_model: { type: ["string", "null"], description: "The requested vehicle brand and model, or null." },
    price_max: { type: ["number", "null"], description: "Maximum numeric price, or null if not specified." },
    year_min: { type: ["number", "null"], description: "Minimum vehicle year, or null if not specified." },
    mileage_max: { type: ["number", "null"], description: "Maximum mileage, or null if not specified." },
    fuel_type: { type: ["string", "null"], description: "Requested fuel type, or null." },
    body_type: { type: ["string", "null"], description: "Requested body type, or null." },
    parsed_features: { type: "array", items: { type: "string" }, description: "Requested vehicle features, or an empty array." },
    location: { type: ["string", "null"], description: "Requested vehicle origin or location, or null." }
  },
  required: ["extracted_make_model", "price_max", "year_min", "mileage_max", "fuel_type", "body_type", "parsed_features", "location"],
  additionalProperties: false
};

const normalize = (value: string) => value.toLowerCase().replace(/[_-]/g, " ").replace(/\s+/g, " ").trim();
const anonymousSearchCookie = "anonymous_search_used";

async function getAuthenticatedUser(request: Request) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!token || !url || !key) return { user: null, token: "" };

  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data } = await supabase.auth.getUser(token);
  return { user: data.user, token };
}

async function saveConversation(userId: string, token: string, prompt: string, aiResponseText: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return false;

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
  const { error } = await supabase.from("conversations").insert({
    conversation_id: randomUUID(),
    user_id: userId,
    turn_index: 1,
    raw_user_prompt: prompt,
    ai_response_text: aiResponseText
  });
  return !error;
}

function matchesSearchContext(listing: (typeof listings)[number], filters: z.infer<typeof searchContextSchema>) {
  const vehicleName = normalize(`${listing.brand} ${listing.model}`);
  const requestedVehicle = filters.extracted_make_model ? normalize(filters.extracted_make_model) : "";
  const requestedFeatures = filters.parsed_features.map(normalize);
  const listingFeatures = listing.features.map(normalize);

  return (
    (!requestedVehicle || vehicleName.includes(requestedVehicle) || requestedVehicle.includes(vehicleName)) &&
    (filters.price_max === null || listing.price <= filters.price_max) &&
    (filters.year_min === null || listing.year >= filters.year_min) &&
    (filters.mileage_max === null || listing.mileage <= filters.mileage_max) &&
    (!filters.fuel_type || normalize(listing.fuel_type) === normalize(filters.fuel_type)) &&
    (!filters.body_type || normalize(listing.body_type) === normalize(filters.body_type)) &&
    (!filters.location || normalize(listing.origin).includes(normalize(filters.location))) &&
    requestedFeatures.every((requestedFeature) => listingFeatures.some((feature) => feature.includes(requestedFeature) || requestedFeature.includes(feature)))
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { prompt?: unknown };
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";

    if (!prompt) return Response.json({ message: "Please enter a vehicle search prompt." }, { status: 400 });

    const { user, token } = await getAuthenticatedUser(request);
    if (!user && request.headers.get("cookie")?.split(";").some((cookie) => cookie.trim() === `${anonymousSearchCookie}=1`)) {
      return NextResponse.json({ code: "ANONYMOUS_SEARCH_LIMIT", message: "Sign in to continue searching." }, { status: 429 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return Response.json({ message: "Gemini search is not configured on the server." }, { status: 500 });

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      contents: `Convert the following natural-language vehicle search into filters. Return null for any filter the user did not specify. Use concise normalized values matching common vehicle listing data.\n\nUser search: ${prompt}`,
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: searchContextJsonSchema
      }
    });

    if (!response.text) return Response.json({ message: "Gemini returned an empty search interpretation." }, { status: 502 });

    const filters = searchContextSchema.parse(JSON.parse(response.text));
    const matchingListings = listings.filter((listing) => matchesSearchContext(listing, filters));
    const conversationSaved = user ? await saveConversation(user.id, token, prompt, response.text) : false;

    const result = NextResponse.json({ listings: matchingListings, conversationSaved });
    if (!user) {
      result.cookies.set(anonymousSearchCookie, "1", {
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 365,
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production"
      });
    }
    return result;
  } catch (error) {
    console.error("Vehicle search failed", error);
    return Response.json({ message: "We could not complete that vehicle search. Please try again." }, { status: 502 });
  }
}
