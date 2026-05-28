# Temporal Relations Strapi Plugin

This workspace contains a Strapi app plus a custom `temporal-relations` plugin for bidirectional, time-based links between content types.

## What the plugin does

The plugin models named relation types such as:

- `bedrijven_groepen_range`
- `koppeling_persoon_bedrijf_id`

Each relation type links two content types and stores concrete links with:

- `source_id`
- `target_id`
- `start_date`
- `end_date`
- `metadata`

The `metadata` JSON field is where per-link attributes such as `Tekenbevoegd` belong.

## Supported use cases

### 1. Bedrijf ↔ Groep history

Example relation type:

- `name`: `bedrijven_groepen_range`
- `sourceUid`: `api::bedrijf.bedrijf`
- `targetUid`: `api::groep.groep`

Example links:

```json
[
  { "sourceId": 214, "targetId": 275, "startDate": "2000-01-01", "endDate": "2025-03-31" },
  { "sourceId": 214, "targetId": 78, "startDate": "2025-04-01", "endDate": "2999-12-31" }
]
```

### 2. Persoon ↔ Bedrijf with `Tekenbevoegd`

Example relation type:

- `name`: `koppeling_persoon_bedrijf_id`
- `sourceUid`: `api::persoon.persoon`
- `targetUid`: `api::bedrijf.bedrijf`

Example links:

```json
[
  {
    "sourceId": 208,
    "targetId": 1,
    "startDate": null,
    "endDate": null,
    "metadata": { "tekenbevoegd": false }
  }
]
```

`null` or empty dates are normalized by the plugin to an open interval:

- `start_date = 0001-01-01`
- `end_date = 2999-12-31`

That means the link is treated as always active unless you later close it.

## Runtime setup

This repo is self-contained and includes a local Node 22 runtime in `.tools/node`.

The app now defaults to SQLite so it can launch without PostgreSQL.

Default database settings in `.env`:

```env
DATABASE_CLIENT=sqlite
DATABASE_FILENAME=.tmp/data.db
```

If you want PostgreSQL instead, uncomment the PostgreSQL section in `.env` and set those values.

## How to start

From the repo root:

1. Run `install.cmd`
2. Run `develop.cmd`
3. Open Strapi at `http://localhost:1337/admin`

Other commands:

- `build.cmd`
- `start.cmd`
- `test.cmd`

## Plugin API

Base path:

```text
/api/temporal-relations
```

### Link type endpoints

- `GET /link-types`
- `POST /link-types`
- `PUT /link-types/:id`
- `DELETE /link-types/:id`

### Link endpoints

- `GET /links`
- `POST /links`
- `POST /links/import`
- `PUT /links/:id`
- `POST /links/:id/terminate`
- `DELETE /links/:id`

### Bidirectional queries

- `GET /links/from-source?linkType=bedrijven_groepen_range&sourceId=214&date=2025-05-01`
- `GET /links/from-target?linkType=bedrijven_groepen_range&targetId=78&date=2025-05-01`
- `GET /links/source-history?linkType=bedrijven_groepen_range&sourceId=214`
- `GET /links/target-history?linkType=bedrijven_groepen_range&targetId=78`

## Import examples

### Create a relation type

```json
POST /api/temporal-relations/link-types
{
  "name": "koppeling_persoon_bedrijf_id",
  "sourceUid": "api::persoon.persoon",
  "targetUid": "api::bedrijf.bedrijf",
  "sourceLabel": "Persoon",
  "targetLabel": "Bedrijf"
}
```

### Bulk import links

```json
POST /api/temporal-relations/links/import
{
  "linkType": "koppeling_persoon_bedrijf_id",
  "links": [
    {
      "sourceId": 208,
      "targetId": 1,
      "startDate": null,
      "endDate": null,
      "metadata": { "tekenbevoegd": false }
    },
    {
      "sourceId": 1638,
      "targetId": 90,
      "startDate": null,
      "endDate": null,
      "metadata": { "tekenbevoegd": false }
    }
  ]
}
```

## Tests

The unit tests cover:

- open interval normalization for null dates
- reverse bidirectional lookup
- metadata persistence for fields like `Tekenbevoegd`
- upsert behavior during import