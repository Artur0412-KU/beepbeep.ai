#!/usr/bin/env node

/**
 * Fetches vehicle listings from AUTO.RIA, RST, mobile.de and OLX and writes
 * the normalized result to features/listings/data/listing-dataset.json.
 *
 * The scraper intentionally uses public listing pages only. These sites vary
 * their HTML frequently, so the parser prefers schema.org JSON-LD and falls
 * back to Open Graph/meta tags. It follows pagination until it has enough
 * listing URLs. Configure search pages with SCRAPER_URLS when a site changes
 * its default URL or when a narrower search is desired.
 */

import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const outputPath = resolve(root, "features/listings/data/listing-dataset.json");

const defaultSearchUrls = {
  auto_ria: "https://auto.ria.com/uk/car/used/",
  rst: "https://rst.ua/oldcars/",
  mobile_de: "https://suchen.mobile.de/fahrzeuge/search.html?vc=Car",
  olx: "https://www.olx.ua/uk/transport/legkovie-avtomobili/"
};

const sourceHosts = {
  auto_ria: ["auto.ria.com"],
  rst: ["rst.ua"],
  mobile_de: ["mobile.de", "suchen.mobile.de"],
  olx: ["olx.ua", "olx.pl", "olx.de"]
};

const requestHeaders = {
  accept: "text/html,application/xhtml+xml,application/json",
  "accept-language": "uk-UA,uk;q=0.9,en;q=0.8",
  "user-agent": process.env.SCRAPER_USER_AGENT || "BeepBeepAI-listings/1.0 (+https://beepbeepai.com)"
};

const sourceLabels = {
  auto_ria: "ria",
  rst: "rst",
  mobile_de: "mbl",
  olx: "olx"
};

const translateFuelType = (value) => {
  const normalized = text(value).toLowerCase().replace(/[\s_-]+/g, " ");
  return ({
    бензин: "petrol",
    gasoline: "petrol",
    gas: "petrol",
    petrol: "petrol",
    дизель: "diesel",
    diesel: "diesel",
    електро: "electric",
    електричний: "electric",
    electric: "electric",
    гібрид: "hybrid",
    гібридний: "hybrid",
    hybrid: "hybrid",
    газ: "lpg",
    lpg: "lpg"
  })[normalized] || normalized || "unknown";
};

const translateBodyType = (value) => {
  const normalized = text(value).toLowerCase().replace(/[\s_-]+/g, " ");
  return ({
    легкові: "passenger car",
    "легковий автомобіль": "passenger car",
    "passenger car": "passenger car",
    sedan: "sedan",
    седан: "sedan",
    suv: "suv",
    позашляховик: "suv",
    crossover: "crossover",
    кросовер: "crossover",
    hatchback: "hatchback",
    хетчбек: "hatchback",
    wagon: "wagon",
    універсал: "wagon",
    coupe: "coupe",
    купе: "coupe",
    convertible: "convertible",
    кабріолет: "convertible",
    minivan: "minivan",
    мінівен: "minivan",
    pickup: "pickup",
    пікап: "pickup"
  })[normalized] || normalized || "unknown";
};

const sleep = (milliseconds) => new Promise((resolveSleep) => setTimeout(resolveSleep, milliseconds));
const compact = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
const text = (value) => compact(typeof value === "string" ? value : "");
const number = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const match = String(value ?? "").replace(/\u00a0/g, " ").match(/[-+]?\d[\d\s.,]*/);
  if (!match) return null;
  const normalized = match[0].replace(/\s/g, "").replace(/,(?=\d{1,2}$)/, ".").replace(/\.(?=\d{3}(?:\D|$))/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

function decodeHtml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function htmlValue(html, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["']`, "i"))
    || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["']`, "i"));
  return match ? decodeHtml(match[1]) : "";
}

function jsonLdObjects(html) {
  return [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .flatMap((match) => {
      try {
        const parsed = JSON.parse(match[1].trim());
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        return [];
      }
    });
}

function findVehicleObject(html) {
  return jsonLdObjects(html).find((item) => ["car", "vehicle", "product"].includes(String(item?.['@type']).toLowerCase()))
    || jsonLdObjects(html).find((item) => item?.offers || item?.brand || item?.vehicleModel);
}

function absoluteUrl(value, baseUrl) {
  try {
    return new URL(value, baseUrl).href;
  } catch {
    return "";
  }
}

function sourceFromUrl(url) {
  const host = new URL(url).hostname.replace(/^www\./, "");
  return Object.entries(sourceHosts).find(([, hosts]) => hosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`)))?.[0] || null;
}

function listingLinks(html, baseUrl, source) {
  const hosts = sourceHosts[source];
  const candidates = [...html.matchAll(/<a\b[^>]+href=["']([^"']+)["'][^>]*>/gi)]
    .map((match) => absoluteUrl(decodeHtml(match[1]), baseUrl))
    .filter(Boolean)
    .filter((url) => {
      const parsed = new URL(url);
      return hosts.some((host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`));
    });

  const patterns = {
    auto_ria: /\/auto_[^/]+_\d+\.html|\/uk\/auto\/[^/]+/i,
    rst: /\/oldcars\/[^/]+\/[^/]+\/[^/]+_\d+\.html/i,
    mobile_de: /\/auto-inserat\/[^/]+\/[^/]+\/\d+\.html/i,
    olx: /\/d\/[^/]+\/obyavlenie\/[^/]+-ID[^/]+\.html/i
  };

    return [...new Set(candidates.filter((url) => patterns[source].test(url)))];
}

function paginationLinks(html, baseUrl, source) {
  const listingPage = new URL(baseUrl);
  const hosts = sourceHosts[source];
  return [...new Set([...html.matchAll(/<a\b[^>]+href=["']([^"']+)["'][^>]*>/gi)]
    .map((match) => absoluteUrl(decodeHtml(match[1]), baseUrl))
    .filter(Boolean)
    .filter((url) => {
      const parsed = new URL(url);
      if (!hosts.some((host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`))) return false;
      if (url === baseUrl || url.startsWith(`${baseUrl}#`)) return false;
      if (/\/auto_[^/]+_\d+\.html|\/auto-inserat\/|\/obyavlenie\/|\/oldcars\/[^/]+\/[^/]+\/[^/]+_\d+\.html/i.test(url)) return false;
      return parsed.pathname === listingPage.pathname || /(?:page|pagina|p|pageNumber|offset|start)=?\d+/i.test(parsed.search);
    }))].slice(0, 20);
}

async function collectListingUrls(source, searchUrl) {
  const maxListings = Number(process.env.SCRAPER_MAX_PER_SOURCE || 50);
  const maxSearchPages = Number(process.env.SCRAPER_MAX_SEARCH_PAGES || 20);
  const pending = [searchUrl];
  const visited = new Set();
  const listingUrls = new Set();

  while (pending.length && visited.size < maxSearchPages && listingUrls.size < maxListings) {
    const pageUrl = pending.shift();
    if (visited.has(pageUrl)) continue;
    visited.add(pageUrl);

    try {
      const html = await fetchPage(pageUrl);
      for (const listingUrl of listingLinks(html, pageUrl, source)) {
        listingUrls.add(listingUrl);
        if (listingUrls.size >= maxListings) break;
      }
      if (listingUrls.size < maxListings) pending.push(...paginationLinks(html, pageUrl, source));
    } catch (error) {
      console.warn(`[${source}] search page skipped ${pageUrl}: ${error.message}`);
    }
  }

  return [...listingUrls].slice(0, maxListings);
}

function normalizeFeatures(vehicle, html) {
  const raw = [vehicle?.additionalProperty, vehicle?.features, htmlValue(html, "product:availability")]
    .flat(Infinity)
    .map((item) => typeof item === "object" ? item?.value || item?.name : item)
    .map(text)
    .filter(Boolean);
  return [...new Set(raw.flatMap((item) => item.split(/[,;|]/).map((part) => part.toLowerCase().replace(/[^a-z0-9а-яіїєґ ]/gi, "").replace(/\s+/g, "_").trim()).filter(Boolean)))].slice(0, 20);
}

function normalizeListing(html, url, source) {
  const vehicle = findVehicleObject(html) || {};
  const offers = Array.isArray(vehicle.offers) ? vehicle.offers[0] : (vehicle.offers || {});
  const brand = text(vehicle.brand?.name || vehicle.brand || htmlValue(html, "car:brand") || htmlValue(html, "og:site_name"));
  const model = text(vehicle.model || vehicle.vehicleModel || vehicle.name || htmlValue(html, "og:title")).replace(new RegExp(`^${brand}\\s*`, "i"), "");
  const imageValues = [...new Set([vehicle.image, vehicle.images, htmlValue(html, "og:image")]
    .flat(Infinity)
    .map((image) => absoluteUrl(image, url))
    .filter(Boolean))]
    .sort((first, second) => Number(second.includes("cdn0.riastatic.com")) - Number(first.includes("cdn0.riastatic.com")));
  const year = number(vehicle.vehicleModelDate || vehicle.productionDate || vehicle.modelDate || html.match(/\b(?:19|20)\d{2}\b/)?.[0]);
  const mileage = number(vehicle.mileageFromOdometer?.value || vehicle.mileage || html.match(/(?:\d[\d\s.,]*)\s*(?:km|км|kilometer)/i)?.[0]);
  const price = number(offers.price || vehicle.price || htmlValue(html, "product:price:amount") || html.match(/(?:€|\$|₴|грн)\s*[\d\s.,]+/i)?.[0]);
  const currency = text(offers.priceCurrency || htmlValue(html, "product:price:currency") || (url.includes("mobile.de") ? "EUR" : "USD")).toUpperCase();
  const title = text(vehicle.name || htmlValue(html, "og:title"));

  if (!brand && !model && !title) return null;

  const sourceId = sourceLabels[source];
  const idMatch = url.match(/(\d{5,})/g);
  const listingId = `${sourceId}_${idMatch?.at(-1) || Buffer.from(url).toString("base64url").slice(0, 12)}`;
  return {
    listing_id: listingId,
    year: year || 0,
    brand: brand || title.split(" ")[0] || "Unknown",
    model: model || title.replace(brand, "").trim() || "Unknown",
    origin: source === "mobile_de" ? "Germany" : "Ukraine",
    mileage: mileage || 0,
    body_type: translateBodyType(vehicle.bodyType),
    fuel_type: translateFuelType(vehicle.fuelType),
    price: price || 0,
    currency: currency || "USD",
    navigate_link: url,
    features: normalizeFeatures(vehicle, html),
    img_array: [...new Set(imageValues)].slice(0, 8)
  };
}

async function fetchPage(url) {
  const response = await fetch(url, { headers: requestHeaders, redirect: "follow", signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

async function scrapeSource(source, searchUrl) {
  try {
    const urls = await collectListingUrls(source, searchUrl);
    const listings = [];
    for (const url of urls) {
      try {
        const html = await fetchPage(url);
        const listing = normalizeListing(html, url, source);
        if (listing) listings.push(listing);
      } catch (error) {
        console.warn(`[${source}] skipped ${url}: ${error.message}`);
      }
      await sleep(Number(process.env.SCRAPER_DELAY_MS || 500));
    }
    console.log(`[${source}] found ${listings.length} listings from ${urls.length} links`);
    return listings;
  } catch (error) {
    console.warn(`[${source}] unavailable: ${error.message}`);
    return [];
  }
}

function configuredSearchUrls() {
  if (!process.env.SCRAPER_URLS) return defaultSearchUrls;
  const configured = JSON.parse(process.env.SCRAPER_URLS);
  return Object.fromEntries(Object.entries(defaultSearchUrls).map(([source, fallback]) => [source, configured[source] || fallback]));
}

async function main() {
  const urls = configuredSearchUrls();
  const minimumListings = Number(process.env.SCRAPER_MIN_LISTINGS || 200);
  const scraped = (await Promise.all(Object.entries(urls).map(([source, url]) => scrapeSource(source, url)))).flat();
  const unique = [...new Map(scraped.map((listing) => [listing.listing_id, listing])).values()];

  if (unique.length < minimumListings) {
    const existing = JSON.parse(await readFile(outputPath, "utf8"));
    console.warn(`Fetched ${unique.length}/${minimumListings} listings; preserving ${existing.length} existing listings.`);
    return;
  }

  await writeFile(outputPath, `${JSON.stringify(unique, null, 2)}\n`, "utf8");
  console.log(`Wrote ${unique.length} listings to ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
