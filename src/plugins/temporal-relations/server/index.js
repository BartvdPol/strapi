'use strict';

const contentTypes = require('./content-types');
const controllers  = require('./controllers');
const middlewares  = require('./middlewares');
const policies     = require('./policies');
const routes       = require('./routes');
const services     = require('./services');

// ─── Seed data ────────────────────────────────────────────────────────────────

const LINK_TYPE_UID = 'plugin::temporal-relations.temporal-link-type';
const LINK_UID      = 'plugin::temporal-relations.temporal-link';
const BEDRIJF_UID   = 'api::bedrijf.bedrijf';
const GROEP_UID     = 'api::groep.groep';
const PERSON_UID    = 'api::persoon.persoon';
const OPEN_START    = '0001-01-01';
const OPEN_END      = '2999-12-31';

const SEED_BEDRIJVEN = [
  { external_id: 1, naam: 'ACME BV' },
  { external_id: 4, naam: 'Apotheek Emmen' },
  { external_id: 5, naam: 'Apotheek Themmen' },
  { external_id: 6, naam: 'Apotheek Kloosterveen' },
  { external_id: 7, naam: 'Bedrijf 7' },
  { external_id: 8, naam: 'Bedrijf 8' },
  { external_id: 9, naam: 'Bedrijf 9' },
  { external_id: 10, naam: 'Bedrijf 10' },
  { external_id: 90, naam: 'Bedrijf 90' },
  { external_id: 157, naam: 'Bedrijf 157' },
  { external_id: 214, naam: 'De VN Apotheek' },
  { external_id: 244, naam: 'Apotheek Didam' },
];

const SEED_GROEPEN = [
  { external_id: 32, naam: 'Kloosterveen' },
  { external_id: 38, naam: 'Nobellaan' },
  { external_id: 78, naam: 'Soesterkwartier' },
  { external_id: 228, naam: 'Emmen' },
  { external_id: 244, naam: 'Teegeetee Apotheken' },
  { external_id: 275, naam: 'De VN Apotheek B.V.' },
];

const SEED_PERSONEN = [
  { external_id: 3, username: 'jbiermans', user_role: 'vennoot' },
  { external_id: 4, username: 'rgroot', user_role: 'aangeslotene' },
  { external_id: 5, username: 'gstolk', user_role: null },
  { external_id: 6, username: 'persoon_6', user_role: null },
  { external_id: 7, username: 'boer-brouns', user_role: 'aangeslotene' },
  { external_id: 8, username: 'bquik', user_role: 'aangeslotene' },
  { external_id: 208, username: 'persoon_208', user_role: null },
  { external_id: 358, username: 'persoon_358', user_role: null },
  { external_id: 1633, username: 'persoon_1633', user_role: null },
  { external_id: 1634, username: 'persoon_1634', user_role: null },
  { external_id: 1636, username: 'persoon_1636', user_role: null },
  { external_id: 1637, username: 'persoon_1637', user_role: null },
  { external_id: 1638, username: 'persoon_1638', user_role: null },
  { external_id: 1639, username: 'persoon_1639', user_role: null },
  { external_id: 1641, username: 'persoon_1641', user_role: null },
  { external_id: 1648, username: 'persoon_1648', user_role: null },
];

/** Link type definitions */
const SEED_LINK_TYPES = [
  {
    name:         'bedrijven_groepen_range',
    source_uid:   'api::bedrijf.bedrijf',
    target_uid:   'api::groep.groep',
    source_label: 'Bedrijf',
    target_label: 'Groep',
    description:  'Time-bounded membership of a bedrijf in a bedrijven-groep',
  },
  {
    name:         'koppeling_persoon_bedrijf',
    source_uid:   'api::persoon.persoon',
    target_uid:   'api::bedrijf.bedrijf',
    source_label: 'Persoon',
    target_label: 'Bedrijf',
    description:  'Time-bounded link between a persoon and a bedrijf',
  },
];

/** Temporal links – bedrijven_groepen_range (source = bedrijf_id, target = groep_id) */
const SEED_LINKS_BGR = [
  // Real SQL data (bedrijf_ids from STAM.bedrijven)
  { source_id: 214, target_id: 275, start_date: '2000-01-01', end_date: '2025-03-31' },
  { source_id: 214, target_id:  78, start_date: '2025-04-01', end_date: OPEN_END     },
  { source_id:   4, target_id: 228, start_date: '2000-01-01', end_date: OPEN_END     },
  { source_id:   5, target_id:  38, start_date: '2000-01-01', end_date: OPEN_END     },
  { source_id:   6, target_id:  32, start_date: '2000-01-01', end_date: OPEN_END     },
  { source_id:   7, target_id: 244, start_date: '2000-01-01', end_date: OPEN_END     },
  { source_id:   8, target_id: 244, start_date: '2000-01-01', end_date: OPEN_END     },
  { source_id:   9, target_id: 244, start_date: '2000-01-01', end_date: OPEN_END     },
  { source_id:  10, target_id: 244, start_date: '2000-01-01', end_date: OPEN_END     },
  // Demo entries on external IDs for ACME BV
  { source_id:   1, target_id: 275, start_date: '2018-01-01', end_date: '2024-12-31' },
  { source_id:   1, target_id:  78, start_date: '2025-01-01', end_date: OPEN_END     },
];

/** Temporal links – koppeling_persoon_bedrijf (source = persoon_id, target = bedrijf_id) */
const SEED_LINKS_KPB = [
  { source_id:  208, target_id:   1, metadata: { tekenbevoegd: false } },
  { source_id: 1638, target_id:  90, metadata: { tekenbevoegd: false } },
  { source_id: 1633, target_id: 157, metadata: { tekenbevoegd: false } },
  { source_id:  358, target_id: 157, metadata: { tekenbevoegd: false } },
  { source_id: 1634, target_id: 157, metadata: { tekenbevoegd: false } },
  { source_id: 1636, target_id: 157, metadata: { tekenbevoegd: false } },
  { source_id: 1637, target_id: 157, metadata: { tekenbevoegd: false } },
  { source_id: 1639, target_id: 157, metadata: { tekenbevoegd: false } },
  { source_id: 1648, target_id: 157, metadata: { tekenbevoegd: false } },
  { source_id: 1641, target_id: 157, metadata: { tekenbevoegd: false } },
];

// ─── Bootstrap ────────────────────────────────────────────────────────────────

async function seedLinkTypes(strapi) {
  for (const lt of SEED_LINK_TYPES) {
    const existing = await strapi.entityService.findMany(LINK_TYPE_UID, {
      filters: { name: lt.name },
      limit: 1,
    });
    if (existing.length === 0) {
      await strapi.entityService.create(LINK_TYPE_UID, { data: lt });
      strapi.log.info(`[temporal-relations] seeded link type "${lt.name}"`);
    }
  }
}

async function upsertByExternalId(strapi, uid, data, uniqueField) {
  const payload = { ...data, publishedAt: new Date().toISOString() };
  let existing = [];
  if (payload.external_id !== undefined && payload.external_id !== null) {
    existing = await strapi.entityService.findMany(uid, {
      filters: { external_id: payload.external_id },
      limit: 1,
    });
  }

  if (!existing.length && uniqueField && payload[uniqueField]) {
    existing = await strapi.entityService.findMany(uid, {
      filters: { [uniqueField]: payload[uniqueField] },
      limit: 1,
    });
  }

  if (!existing.length) {
    await strapi.entityService.create(uid, { data: payload });
    return;
  }

  const current = existing[0];
  const patch = {};
  for (const [key, value] of Object.entries(payload)) {
    if (current[key] !== value) patch[key] = value;
  }
  if (Object.keys(patch).length > 0) {
    await strapi.entityService.update(uid, current.id, { data: patch });
  }
}

async function seedCoreEntities(strapi) {
  for (const bedrijf of SEED_BEDRIJVEN) {
    await upsertByExternalId(strapi, BEDRIJF_UID, bedrijf, 'naam');
  }

  for (const groep of SEED_GROEPEN) {
    await upsertByExternalId(strapi, GROEP_UID, groep, 'naam');
  }

  for (const persoon of SEED_PERSONEN) {
    await upsertByExternalId(strapi, PERSON_UID, persoon, 'username');
  }
}

async function normalizeLinkIds(strapi, linkTypeName, sourceUid, targetUid) {
  const sourceRows = await strapi.entityService.findMany(sourceUid, { fields: ['id', 'external_id'], limit: 2000 });
  const targetRows = await strapi.entityService.findMany(targetUid, { fields: ['id', 'external_id'], limit: 2000 });

  const sourceMap = new Map(sourceRows.filter((r) => r.external_id).map((r) => [r.id, r.external_id]));
  const targetMap = new Map(targetRows.filter((r) => r.external_id).map((r) => [r.id, r.external_id]));

  const links = await strapi.db.query(LINK_UID).findMany({ where: { link_type: linkTypeName } });

  for (const link of links) {
    const mappedSource = sourceMap.get(link.source_id) ?? link.source_id;
    const mappedTarget = targetMap.get(link.target_id) ?? link.target_id;

    if (mappedSource === link.source_id && mappedTarget === link.target_id) continue;

    const duplicate = await strapi.db.query(LINK_UID).findOne({
      where: {
        link_type: linkTypeName,
        source_id: mappedSource,
        target_id: mappedTarget,
        start_date: link.start_date,
        end_date: link.end_date,
      },
    });

    if (duplicate) {
      await strapi.db.query(LINK_UID).delete({ where: { id: link.id } });
      continue;
    }

    await strapi.db.query(LINK_UID).update({
      where: { id: link.id },
      data: { source_id: mappedSource, target_id: mappedTarget },
    });
  }
}

async function seedLinks(strapi, linkTypeName, rows) {
  for (const row of rows) {
    const filters = {
      link_type: linkTypeName,
      source_id: row.source_id,
      target_id: row.target_id,
      start_date: row.start_date ?? OPEN_START,
      end_date:   row.end_date   ?? OPEN_END,
    };
    const existing = await strapi.entityService.findMany(LINK_UID, {
      filters,
      limit: 1,
    });
    if (existing.length === 0) {
      await strapi.entityService.create(LINK_UID, {
        data: {
          link_type:  linkTypeName,
          source_id:  row.source_id,
          target_id:  row.target_id,
          start_date: row.start_date ?? OPEN_START,
          end_date:   row.end_date   ?? OPEN_END,
          metadata:   row.metadata   ?? null,
        },
      });
    }
  }
  strapi.log.info(`[temporal-relations] seeded ${rows.length} links for "${linkTypeName}"`);
}

async function seedKoppelingPersoonBedrijfDemo(strapi) {
  const demoRows = [
    {
      username: 'jbiermans',
      target_id: 1,
      start_date: '2019-01-01',
      end_date: '2023-12-31',
      metadata: { tekenbevoegd: false },
    },
    {
      username: 'jbiermans',
      target_id: 1,
      start_date: '2024-01-01',
      end_date: OPEN_END,
      metadata: { tekenbevoegd: true },
    },
    {
      username: 'rgroot',
      target_id: 1,
      start_date: '2025-01-01',
      end_date: OPEN_END,
      metadata: { tekenbevoegd: false },
    },
  ];

  for (const row of demoRows) {
    const persoon = await strapi.entityService.findMany(PERSON_UID, {
      filters: { username: row.username },
      limit: 1,
    });
    if (!persoon.length) continue;

    const source_id = persoon[0].external_id ?? persoon[0].id;
    const filters = {
      link_type: 'koppeling_persoon_bedrijf',
      source_id,
      target_id: row.target_id,
      start_date: row.start_date,
      end_date: row.end_date,
    };

    const existing = await strapi.entityService.findMany(LINK_UID, { filters, limit: 1 });
    if (existing.length === 0) {
      await strapi.entityService.create(LINK_UID, {
        data: {
          link_type: 'koppeling_persoon_bedrijf',
          source_id,
          target_id: row.target_id,
          start_date: row.start_date,
          end_date: row.end_date,
          metadata: row.metadata,
        },
      });
    }
  }
}

// ─── Plugin export ────────────────────────────────────────────────────────────

module.exports = () => ({
  register(/*{ strapi }*/) {},

  async bootstrap({ strapi }) {
    strapi.log.info('[temporal-relations] Bootstrap function started');
    try {
      await seedCoreEntities(strapi);
      await seedLinkTypes(strapi);
      strapi.log.info('[temporal-relations] Link types seeded successfully');
      await normalizeLinkIds(strapi, 'bedrijven_groepen_range', BEDRIJF_UID, GROEP_UID);
      await normalizeLinkIds(strapi, 'koppeling_persoon_bedrijf', PERSON_UID, BEDRIJF_UID);
      await seedLinks(strapi, 'bedrijven_groepen_range', SEED_LINKS_BGR);
      strapi.log.info('[temporal-relations] Links for bedrijven_groepen_range seeded successfully');
      await seedLinks(strapi, 'koppeling_persoon_bedrijf', SEED_LINKS_KPB);
      await seedKoppelingPersoonBedrijfDemo(strapi);
      strapi.log.info('[temporal-relations] Links for koppeling_persoon_bedrijf seeded successfully');
    } catch (error) {
      strapi.log.error('[temporal-relations] Error during bootstrap:', error);
    }
  },
  destroy(/*{ strapi }*/) {},
  contentTypes,
  controllers,
  middlewares,
  policies,
  routes,
  services,
});
