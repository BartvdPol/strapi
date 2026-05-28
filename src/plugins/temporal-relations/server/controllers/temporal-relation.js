'use strict';

/**
 * Temporal-relation controller
 *
 * Two resource groups:
 *   /link-types  – CRUD for relation type definitions
 *   /links       – CRUD + bidirectional queries for time-bounded links
 */

const SVC = 'plugin::temporal-relations.temporal-relation';

// ─── helpers ────────────────────────────────────────────────────────────────

function svc() {
  return strapi.service(SVC);
}

function intParam(value) {
  return value !== undefined ? Number(value) : undefined;
}

// ─── CONTENT HELPERS ────────────────────────────────────────────────────────

async function listGroepen(ctx) {
  const groepen = await strapi.documents('api::groep.groep').findMany({
    fields: ['id', 'external_id', 'naam', 'documentId'],
    sort: 'naam:asc',
    limit: 500,
  });
  ctx.body = { data: groepen };
}

async function listBedrijven(ctx) {
  const bedrijven = await strapi.documents('api::bedrijf.bedrijf').findMany({
    fields: ['id', 'external_id', 'naam', 'documentId'],
    sort: 'naam:asc',
    limit: 500,
  });
  ctx.body = { data: bedrijven };
}

async function listPersonen(ctx) {
  const personen = await strapi.documents('api::persoon.persoon').findMany({
    fields: ['id', 'external_id', 'username', 'user_role', 'documentId'],
    sort: 'username:asc',
    limit: 500,
  });
  ctx.body = { data: personen };
}

// ─── LINK TYPES ─────────────────────────────────────────────────────────────

async function listLinkTypes(ctx) {
  ctx.body = { data: await svc().listLinkTypes() };
}

async function createLinkType(ctx) {
  const { name, sourceUid, targetUid, sourceLabel, targetLabel, description } = ctx.request.body;
  const result = await svc().createLinkType({ name, sourceUid, targetUid, sourceLabel, targetLabel, description });
  ctx.status = 201;
  ctx.body = { data: result };
}

async function updateLinkType(ctx) {
  const { id } = ctx.params;
  const { sourceUid, targetUid, sourceLabel, targetLabel, description } = ctx.request.body;
  ctx.body = { data: await svc().updateLinkType(id, { sourceUid, targetUid, sourceLabel, targetLabel, description }) };
}

async function deleteLinkType(ctx) {
  const { id } = ctx.params;
  ctx.body = { data: await svc().deleteLinkType(id) };
}

// ─── LINKS — list / paginate ─────────────────────────────────────────────────

async function findLinks(ctx) {
  const { page, pageSize, linkType, sourceId, targetId, sort } = ctx.query;
  const filters = {};
  if (linkType) filters.link_type = linkType;
  if (sourceId) filters.source_id = Number(sourceId);
  if (targetId) filters.target_id = Number(targetId);
  const sortParam = sort ? JSON.parse(sort) : { start_date: 'desc' };
  ctx.body = await svc().findLinks({ page: Number(page || 1), pageSize: Number(pageSize || 25), filters, sort: sortParam });
}

// ─── LINKS — bidirectional queries ──────────────────────────────────────────

/**
 * SOURCE → TARGET  (forward)
 * GET /links/from-source?linkType=bedrijven_groepen_range&sourceId=214&date=2025-05-01
 * "Which groep(en) does bedrijf 214 belong to on 2025-05-01?"
 */
async function getActiveLinksFromSource(ctx) {
  const { linkType, sourceId, date } = ctx.query;
  ctx.body = { data: await svc().getActiveLinksFromSource(linkType, intParam(sourceId), date) };
}

/**
 * TARGET → SOURCES  (reverse / bidirectional)
 * GET /links/from-target?linkType=bedrijven_groepen_range&targetId=78&date=2025-05-01
 * "Which bedrijven belong to groep 78 on 2025-05-01?"
 */
async function getActiveLinksFromTarget(ctx) {
  const { linkType, targetId, date } = ctx.query;
  ctx.body = { data: await svc().getActiveLinksFromTarget(linkType, intParam(targetId), date) };
}

/**
 * FULL HISTORY — source side
 * GET /links/source-history?linkType=bedrijven_groepen_range&sourceId=214
 */
async function getSourceHistory(ctx) {
  const { linkType, sourceId } = ctx.query;
  ctx.body = { data: await svc().getSourceHistory(linkType, intParam(sourceId)) };
}

/**
 * FULL HISTORY — target side
 * GET /links/target-history?linkType=bedrijven_groepen_range&targetId=78
 */
async function getTargetHistory(ctx) {
  const { linkType, targetId } = ctx.query;
  ctx.body = { data: await svc().getTargetHistory(linkType, intParam(targetId)) };
}

/**
 * Overlap a date range
 * GET /links/range?linkType=...&rangeStart=2025-01-01&rangeEnd=2025-12-31&sourceId=214
 */
async function getLinksByDateRange(ctx) {
  const { linkType, rangeStart, rangeEnd, sourceId, targetId } = ctx.query;
  ctx.body = {
    data: await svc().getLinksByDateRange({
      linkType, rangeStart, rangeEnd,
      sourceId: intParam(sourceId),
      targetId: intParam(targetId),
    }),
  };
}

// ─── LINKS — CRUD ────────────────────────────────────────────────────────────

async function createLink(ctx) {
  const { linkType, sourceId, targetId, startDate, endDate, metadata } = ctx.request.body;
  ctx.status = 201;
  ctx.body = { data: await svc().createLink({ linkType, sourceId, targetId, startDate, endDate, metadata }) };
}

async function importLinks(ctx) {
  const { linkType, links } = ctx.request.body;
  ctx.body = await svc().importLinks(linkType, links);
}

async function updateLink(ctx) {
  const { id } = ctx.params;
  const { startDate, endDate, metadata } = ctx.request.body;
  ctx.body = { data: await svc().updateLink(Number(id), { startDate, endDate, metadata }) };
}

async function terminateLink(ctx) {
  const { id } = ctx.params;
  const { endDate } = ctx.request.body;
  ctx.body = { data: await svc().terminateLink(Number(id), endDate) };
}

async function deleteLink(ctx) {
  const { id } = ctx.params;
  ctx.body = { data: await svc().deleteLink(Number(id)) };
}

module.exports = {
  listGroepen,
  listBedrijven,
  listPersonen,
  listLinkTypes,
  createLinkType,
  updateLinkType,
  deleteLinkType,
  findLinks,
  getActiveLinksFromSource,
  getActiveLinksFromTarget,
  getSourceHistory,
  getTargetHistory,
  getLinksByDateRange,
  createLink,
  importLinks,
  updateLink,
  terminateLink,
  deleteLink,
};

