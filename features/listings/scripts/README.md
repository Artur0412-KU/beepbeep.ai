# Listings scraper

Run `npm run scrape:listings` to fetch at least 200 public listing pages from
AUTO.RIA, RST, mobile.de and OLX. The scraper follows marketplace pagination
and writes the normalized records to `features/listings/data/listing-dataset.json`.

The scraper reads one search page per source, discovers detail-page links, and
extracts schema.org JSON-LD with Open Graph/meta fallbacks. Search URLs can be
overridden without editing code:

```sh
SCRAPER_URLS='{"auto_ria":"https://auto.ria.com/uk/car/used/toyota/","rst":"https://rst.ua/oldcars/toyota/","mobile_de":"https://suchen.mobile.de/fahrzeuge/search.html?vc=Car","olx":"https://www.olx.ua/uk/transport/legkovie-avtomobili/"}' npm run scrape:listings
```

Useful optional settings are `SCRAPER_MIN_LISTINGS` (default `200`),
`SCRAPER_MAX_PER_SOURCE` (default `50`), `SCRAPER_MAX_SEARCH_PAGES` (default
`20`), `SCRAPER_DELAY_MS`, and `SCRAPER_USER_AGENT`. If fewer than the minimum
are fetched, the existing JSON file is preserved.
