'use strict';

const contentTypes = require('./content-types');
const controllers = require('./controllers');
const middlewares = require('./middlewares');
const policies = require('./policies');
const routes = require('./routes');
const services = require('./services');

const BEDRIJF_UID = 'api::bedrijf.bedrijf';
const GROEP_UID = 'api::groep.groep';
const PERSON_UID = 'api::persoon.persoon';
const OPEN_END = '2999-12-31';

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

const SEED_LINK_TYPES = [
  {
    name: 'bedrijven_groepen_range',
    sourceUid: BEDRIJF_UID,
    targetUid: GROEP_UID,
  },
  {
    name: 'koppeling_persoon_bedrijf',
    sourceUid: PERSON_UID,
    targetUid: BEDRIJF_UID,
  },
];

const SEED_LINKS_BGR = [
  { sourceId: 214, targetId: 275, startDate: '2000-01-01', endDate: '2025-03-31' },
  { sourceId: 214, targetId: 78, startDate: '2025-04-01', endDate: OPEN_END },
  { sourceId: 4, targetId: 228, startDate: '2000-01-01', endDate: OPEN_END },
  { sourceId: 5, targetId: 38, startDate: '2000-01-01', endDate: OPEN_END },
  { sourceId: 6, targetId: 32, startDate: '2000-01-01', endDate: OPEN_END },
  { sourceId: 7, targetId: 244, startDate: '2000-01-01', endDate: OPEN_END },
  { sourceId: 8, targetId: 244, startDate: '2000-01-01', endDate: OPEN_END },
  { sourceId: 9, targetId: 244, startDate: '2000-01-01', endDate: OPEN_END },
  { sourceId: 10, targetId: 244, startDate: '2000-01-01', endDate: OPEN_END },
  { sourceId: 1, targetId: 275, startDate: '2018-01-01', endDate: '2024-12-31' },
  { sourceId: 1, targetId: 78, startDate: '2025-01-01', endDate: OPEN_END },
];

const SEED_LINKS_KPB = [
  { sourceId: 208, targetId: 1, metadata: { tekenbevoegd: false } },
  { sourceId: 1638, targetId: 90, metadata: { tekenbevoegd: false } },
  { sourceId: 1633, targetId: 157, metadata: { tekenbevoegd: false } },
  { sourceId: 358, targetId: 157, metadata: { tekenbevoegd: false } },
  { sourceId: 1634, targetId: 157, metadata: { tekenbevoegd: false } },
  { sourceId: 1636, targetId: 157, metadata: { tekenbevoegd: false } },
  { sourceId: 1637, targetId: 157, metadata: { tekenbevoegd: false } },
  { sourceId: 1639, targetId: 157, metadata: { tekenbevoegd: false } },
  { sourceId: 1648, targetId: 157, metadata: { tekenbevoegd: false } },
  { sourceId: 1641, targetId: 157, metadata: { tekenbevoegd: false } },
];

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

async function ensureLinkTypes(strapi) {
  const relationSvc = strapi.service('plugin::temporal-relations.temporal-relation');
  const existing = await relationSvc.listLinkTypes();
  const existingByName = new Map(existing.map((item) => [item.name, item]));

  for (const linkType of SEED_LINK_TYPES) {
    if (!existingByName.has(linkType.name)) {
      await relationSvc.createLinkType(linkType);
      strapi.log.info(`[temporal-relations] created table-backed link type "${linkType.name}"`);
    }
  }
}

async function seedLinks(strapi, linkType, links) {
  const relationSvc = strapi.service('plugin::temporal-relations.temporal-relation');
  const result = await relationSvc.importLinks(linkType, links);
  strapi.log.info(`[temporal-relations] seeded ${result.created + result.updated} rows for "${linkType}"`);
}

async function backfillLegacyLinks(strapi) {
  const knex = strapi.db.connection;
  const hasLegacy = await knex.schema.hasTable('temporal_links');
  if (!hasLegacy) return;

  const relationSvc = strapi.service('plugin::temporal-relations.temporal-relation');
  const linkTypes = await relationSvc.listLinkTypes();

  for (const linkType of linkTypes) {
    const legacyRows = await knex('temporal_links').where({ link_type: linkType.name }).select(
      'source_id',
      'target_id',
      'start_date',
      'end_date',
      'metadata'
    );
    if (!legacyRows.length) continue;

    const payload = legacyRows.map((row) => ({
      sourceId: row.source_id,
      targetId: row.target_id,
      startDate: row.start_date,
      endDate: row.end_date,
      metadata: row.metadata,
    }));

    const result = await relationSvc.importLinks(linkType.name, payload);
    strapi.log.info(
      `[temporal-relations] backfilled ${result.created} created / ${result.updated} updated from temporal_links into ${linkType.table_name}`
    );
  }
}

async function seedKoppelingPersoonBedrijfDemo(strapi) {
  const relationSvc = strapi.service('plugin::temporal-relations.temporal-relation');
  const demoRows = [
    {
      username: 'jbiermans',
      targetId: 1,
      startDate: '2019-01-01',
      endDate: '2023-12-31',
      metadata: { tekenbevoegd: false },
    },
    {
      username: 'jbiermans',
      targetId: 1,
      startDate: '2024-01-01',
      endDate: OPEN_END,
      metadata: { tekenbevoegd: true },
    },
    {
      username: 'rgroot',
      targetId: 1,
      startDate: '2025-01-01',
      endDate: OPEN_END,
      metadata: { tekenbevoegd: false },
    },
  ];

  for (const row of demoRows) {
    const persoon = await strapi.entityService.findMany(PERSON_UID, {
      filters: { username: row.username },
      limit: 1,
    });
    if (!persoon.length) continue;

    const sourceId = persoon[0].external_id ?? persoon[0].id;
    await relationSvc.importLinks('koppeling_persoon_bedrijf', [{
      sourceId,
      targetId: row.targetId,
      startDate: row.startDate,
      endDate: row.endDate,
      metadata: row.metadata,
    }]);
  }
}

module.exports = () => ({
  register() {},

  async bootstrap({ strapi }) {
    strapi.log.info('[temporal-relations] Bootstrap function started');
    try {
      await seedCoreEntities(strapi);
      await ensureLinkTypes(strapi);
      await backfillLegacyLinks(strapi);
      await seedLinks(strapi, 'bedrijven_groepen_range', SEED_LINKS_BGR);
      await seedLinks(strapi, 'koppeling_persoon_bedrijf', SEED_LINKS_KPB);
      await seedKoppelingPersoonBedrijfDemo(strapi);
      strapi.log.info('[temporal-relations] bootstrap seed completed');
    } catch (error) {
      strapi.log.error('[temporal-relations] Error during bootstrap:', error);
    }
  },

  destroy() {},
  contentTypes,
  controllers,
  middlewares,
  policies,
  routes,
  services,
});
