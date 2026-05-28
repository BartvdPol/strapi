'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const createService = require('../src/plugins/temporal-relations/server/services/temporal-relation');

function makeStrapi(overrides = {}) {
  const calls = [];
  const entityService = {
    async create(uid, payload) {
      calls.push({ method: 'create', uid, payload });
      return { id: 1, ...payload.data };
    },
    async findMany(uid, payload) {
      calls.push({ method: 'findMany', uid, payload });
      return overrides.findManyResult || [];
    },
    async findOne(uid, id) {
      calls.push({ method: 'findOne', uid, id });
      return overrides.findOneResult || { id, start_date: '2020-01-01', end_date: '2999-12-31', metadata: null };
    },
    async update(uid, id, payload) {
      calls.push({ method: 'update', uid, id, payload });
      return { id, ...payload.data };
    },
    async delete(uid, id) {
      calls.push({ method: 'delete', uid, id });
      return { id };
    },
    async findPage(uid, payload) {
      calls.push({ method: 'findPage', uid, payload });
      return { results: [], pagination: { page: 1, pageSize: 25, pageCount: 1, total: 0 } };
    },
  };

  return { strapi: { entityService }, calls };
}

test('createLink normalizes null dates to open interval and preserves metadata', async () => {
  const { strapi, calls } = makeStrapi();
  const service = createService({ strapi });

  const result = await service.createLink({
    linkType: 'koppeling_persoon_bedrijf_id',
    sourceId: 208,
    targetId: 1,
    startDate: null,
    endDate: null,
    metadata: { tekenbevoegd: false },
  });

  assert.equal(result.start_date, '0001-01-01');
  assert.equal(result.end_date, '2999-12-31');
  assert.deepEqual(result.metadata, { tekenbevoegd: false });
  assert.equal(calls[0].payload.data.link_type, 'koppeling_persoon_bedrijf_id');
});

test('importLinks upserts rows with blank dates and metadata payloads', async () => {
  const { strapi, calls } = makeStrapi({ findManyResult: [{ id: 44, metadata: { tekenbevoegd: true } }] });
  const service = createService({ strapi });

  const summary = await service.importLinks('koppeling_persoon_bedrijf_id', [
    { sourceId: 208, targetId: 1, startDate: '', endDate: '', metadata: { tekenbevoegd: false } },
  ]);

  assert.equal(summary.created, 0);
  assert.equal(summary.updated, 1);
  const updateCall = calls.find((call) => call.method === 'update');
  assert.equal(updateCall.payload.data.end_date, '2999-12-31');
  assert.deepEqual(updateCall.payload.data.metadata, { tekenbevoegd: false });
});

test('getActiveLinksFromTarget performs the reverse bidirectional lookup', async () => {
  const { strapi, calls } = makeStrapi();
  const service = createService({ strapi });

  await service.getActiveLinksFromTarget('bedrijven_groepen_range', 78, '2025-05-01');

  const query = calls.find((call) => call.method === 'findMany');
  assert.equal(query.payload.filters.link_type, 'bedrijven_groepen_range');
  assert.equal(query.payload.filters.target_id, 78);
  assert.deepEqual(query.payload.filters.start_date, { $lte: '2025-05-01' });
  assert.deepEqual(query.payload.filters.end_date, { $gte: '2025-05-01' });
});

test('updateLink accepts null dates to reopen the interval boundaries', async () => {
  const { strapi, calls } = makeStrapi({ findOneResult: { id: 2, start_date: '2024-01-01', end_date: '2024-12-31', metadata: null } });
  const service = createService({ strapi });

  await service.updateLink(2, { startDate: null, endDate: null, metadata: { tekenbevoegd: true } });

  const updateCall = calls.find((call) => call.method === 'update');
  assert.equal(updateCall.payload.data.start_date, '0001-01-01');
  assert.equal(updateCall.payload.data.end_date, '2999-12-31');
  assert.deepEqual(updateCall.payload.data.metadata, { tekenbevoegd: true });
});