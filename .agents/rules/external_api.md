---
rule: external-api-best-practices
scope: project
---

# External API Best Practices (UFNS SIH-26085)

## Overpass API (OpenStreetMap)

- Always use **GET** requests with `?data=<url-encoded-query>` — never POST.
- Always include these headers:
  ```python
  headers = {
      "User-Agent": "UFNS-SIH26085/1.0 (Urban Flood Nowcasting; research use)",
      "Accept": "application/json, text/json, */*",
  }
  ```
- POST to Overpass without a User-Agent returns **HTTP 406 Not Acceptable**.
- Use a timeout of at least 120–180 seconds for large bounding boxes.
- Retry up to 4 times with 30s / 60s / 90s backoff on any HTTP or DNS failure.
- Base URL: `https://overpass-api.de/api/interpreter`
- Mirror (if primary fails): `https://overpass.kumi.systems/api/interpreter`

## OpenTopography DEM API

- Endpoint: `https://portal.opentopography.org/API/globaldem`
- Always use GET with `API_Key=<key>` as a query parameter.
- API key for this project: stored in `API AI/opentopography.txt`
- Read from env var `OPENTOPO_API_KEY` in production — do NOT hardcode in committed files.
- Validate the response magic bytes: GeoTIFF starts with bytes `II*NUL` or `MMNUL*`.
  If not a TIFF, log the response body (it is an HTML/XML error page from the portal).
- Retry up to 3 times with 20s / 40s backoff on DNS / network failures.
- GeoTIFF files are typically 2-80 MB depending on bounding box size and demtype.
- Supported demtype values: COP30 (Copernicus 30m), SRTMGL1 (SRTM 30m), AW3D30.

## General External API Rules

- Never use time.sleep() without a logged message indicating the wait reason and duration.
- All downloaded files must have their SHA-256 recorded in manifest.json
  alongside them in data/raw/<city>/manifest.json.
- Skip re-downloading if the target file already exists (idempotent downloads).
- Always create the output directory with mkdir(parents=True, exist_ok=True) before writing.
- Report file size in KB and first 16 hex chars of SHA-256 after every successful save.

## City Bounding Boxes (EPSG:4326)

| City | West | South | East | North | UTM Zone |
|------|------|-------|------|-------|----------|
| Mumbai | 72.75 | 18.88 | 72.98 | 19.28 | EPSG:32643 |
| Vijayawada | 80.55 | 16.45 | 80.72 | 16.58 | EPSG:32644 |

## Data Output Locations

```
data/raw/mumbai/
  mumbai_dem.tif          <- OpenTopography COP30
  mumbai_drains.geojson   <- Overpass waterway=drain/canal/river
  mumbai_roads.geojson    <- Overpass highway=primary/secondary/tertiary/residential
  manifest.json           <- SHA-256 + size record

data/raw/vijayawada/
  vijayawada_dem.tif
  vijayawada_drains.geojson
  vijayawada_roads.geojson
  manifest.json
```
