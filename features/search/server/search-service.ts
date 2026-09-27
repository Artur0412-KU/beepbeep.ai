import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import listings from "@/features/listings/data/listing-dataset.json";
import {
  matchesSearchContext,
  searchContextSchema,
} from "@/features/search/lib/search-context";

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
  if (!url || !key) return null;

  const conversationId = randomUUID();

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
  const { error } = await supabase.from("conversations").insert({
    conversation_id: conversationId,
    user_id: userId,
    turn_index: 1,
    raw_user_prompt: prompt,
    ai_response_text: aiResponseText
  });
  return error ? null : conversationId;
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
    const conversationId = user ? await saveConversation(user.id, token, prompt, response.text) : null;
    const conversationSaved = Boolean(conversationId);

    const result = NextResponse.json({
      listings: matchingListings,
      conversationSaved,
      conversationId,
    });
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
