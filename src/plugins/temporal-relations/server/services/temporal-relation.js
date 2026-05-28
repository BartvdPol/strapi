'use strict';

/**
 * Temporal-relation service
 *
 * Manages named, bidirectional, time-bounded relationships between any two
 * Strapi content types.
 *
 * Terminology
 * -----------
 *   link type  – a named configuration that defines WHICH two content types
 *                are related, e.g. "bedrijven_groepen_range" which links
 *                api::bedrijf.bedrijf  ↔  api::groep.groep
 *   link       – a concrete time-bounded pair: (source_id, target_id) valid
 *                during [start_date, end_date]
 *
 * Bidirectionality
 * ----------------
 *   Given a bedrijf (source), find its active groep (target):
 *     getActiveLinksFromSource('bedrijven_groepen_range', bedrijfId, date)
 *
 *   Given a groep (target), find all its active bedrijven (sources):
 *     getActiveLinksFromTarget('bedrijven_groepen_range', groepId, date)
 *
 * Date semantics
 * --------------
 *   A link is active on date D when  start_date <= D <= end_date.
 *   '2999-12-31' is used as an "open end" (no termination date).
 */

const OPEN_START    = '0001-01-01';
const OPEN_END      = '2999-12-31';
const LINK_UID      = 'plugin::temporal-relations.temporal-link';
const LINK_TYPE_UID = 'plugin::temporal-relations.temporal-link-type';

/**
 * Format a Date or string to YYYY-MM-DD.
 */
function toDateString(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const trimmed = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    throw new Error(`Invalid date value: "${value}". Expected YYYY-MM-DD.`);
  }
  return trimmed.slice(0, 10);
}

function normalizeStartDate(value) {
  if (value === undefined || value === null || value === '') return OPEN_START;
  return toDateString(value);
}

function normalizeEndDate(value) {
  if (value === undefined || value === null || value === '') return OPEN_END;
  return toDateString(value);
}

/** Build the active-on-date filter for entityService queries */
function activeOnDate(date) {
  const d = toDateString(date || new Date());
  return { start_date: { $lte: d }, end_date: { $gte: d } };
}

/** Build the date-range overlap filter (link overlaps [start, end]) */
function overlapsRange(start, end) {
  return { start_date: { $lte: end }, end_date: { $gte: start } };
}

module.exports = ({ strapi }) => ({

  // ═══════════════════════════════════════════════════════════════════════════
  //  LINK TYPE management
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Define a new named bidirectional relation type.
   * Example: bedrijven_groepen_range → bedrijf ↔ groep
   *
   * @param {object} params
   * @param {string} params.name         – unique machine name, e.g. "bedrijven_groepen_range"
   * @param {string} params.sourceUid    – Strapi UID, e.g. "api::bedrijf.bedrijf"
   * @param {string} params.targetUid    – Strapi UID, e.g. "api::groep.groep"
   * @param {string} [params.sourceLabel] – display label, e.g. "Bedrijf"
   * @param {string} [params.targetLabel] – display label, e.g. "Groep"
   * @param {string} [params.description]
   * @returns {Promise<object>}
   */
  async createLinkType({ name, sourceUid, targetUid, sourceLabel, targetLabel, description }) {
    if (!name || !sourceUid || !targetUid) {
      throw new Error('name, sourceUid and targetUid are required.');
    }
    return strapi.entityService.create(LINK_TYPE_UID, {
      data: { name, source_uid: sourceUid, target_uid: targetUid, source_label: sourceLabel, target_label: targetLabel, description },
    });
  },

  /** Get a single link type by its name. */
  async getLinkType(name) {
    const results = await strapi.entityService.findMany(LINK_TYPE_UID, {
      filters: { name },
      limit: 1,
    });
    return results[0] || null;
  },

  /** List all defined link types. */
  async listLinkTypes() {
    return strapi.entityService.findMany(LINK_TYPE_UID, { sort: { name: 'asc' } });
  },

  /** Update an existing link type by id. */
  async updateLinkType(id, { sourceUid, targetUid, sourceLabel, targetLabel, description } = {}) {
    const existing = await strapi.entityService.findOne(LINK_TYPE_UID, id);
    if (!existing) throw new Error(`Link type with id ${id} not found.`);
    const payload = {};
    if (sourceUid    !== undefined) payload.source_uid    = sourceUid;
    if (targetUid    !== undefined) payload.target_uid    = targetUid;
    if (sourceLabel  !== undefined) payload.source_label  = sourceLabel;
    if (targetLabel  !== undefined) payload.target_label  = targetLabel;
    if (description  !== undefined) payload.description   = description;
    return strapi.entityService.update(LINK_TYPE_UID, id, { data: payload });
  },

  /** Delete a link type (does NOT cascade-delete its links). */
  async deleteLinkType(id) {
    const existing = await strapi.entityService.findOne(LINK_TYPE_UID, id);
    if (!existing) throw new Error(`Link type with id ${id} not found.`);
    return strapi.entityService.delete(LINK_TYPE_UID, id);
  },

  // ═══════════════════════════════════════════════════════════════════════════
  //  LINK CRUD
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create a single time-bounded link.
   *
   * @param {object} params
   * @param {string} params.linkType   – name of the link type ("bedrijven_groepen_range")
   * @param {number} params.sourceId   – PK on the source side (bedrijf_id)
   * @param {number} params.targetId   – PK on the target side (groep_id)
   * @param {string|Date} [params.startDate]  – defaults to today
   * @param {string|Date} [params.endDate]    – defaults to '2999-12-31'
   * @param {object} [params.metadata]
   * @returns {Promise<object>}
   */
  async createLink({ linkType, sourceId, targetId, startDate, endDate, metadata }) {
    if (!linkType || !sourceId || !targetId) {
      throw new Error('linkType, sourceId and targetId are required.');
    }
    const start = normalizeStartDate(startDate);
    const end   = normalizeEndDate(endDate);
    if (start > end) throw new Error(`start_date (${start}) must not be after end_date (${end}).`);

    return strapi.entityService.create(LINK_UID, {
      data: {
        link_type: linkType,
        source_id: Number(sourceId),
        target_id: Number(targetId),
        start_date: start,
        end_date: end,
        metadata: metadata || null,
        last_refresh_date: new Date().toISOString(),
      },
    });
  },

  /**
   * Bulk upsert links.
   * Natural key for upsert: (link_type, source_id, target_id, start_date).
   * Matches the INSERT pattern from the SQL example.
   *
   * @param {string} linkType  – name of the link type
   * @param {Array<object>} links
   *   Each item: { sourceId, targetId, startDate?, endDate?, metadata? }
   * @returns {Promise<{created, updated, errors}>}
   */
  async importLinks(linkType, links) {
    if (!linkType) throw new Error('linkType is required.');
    if (!Array.isArray(links) || links.length === 0) throw new Error('links must be a non-empty array.');

    let created = 0, updated = 0;
    const errors = [];
    const now = new Date().toISOString();

    for (const item of links) {
      try {
        const { sourceId, targetId, startDate, endDate, metadata } = item;
        const start = normalizeStartDate(startDate);
        const end   = normalizeEndDate(endDate);

        const existing = await strapi.entityService.findMany(LINK_UID, {
          filters: { link_type: linkType, source_id: Number(sourceId), target_id: Number(targetId), start_date: start },
          limit: 1,
        });

        if (existing && existing.length > 0) {
          await strapi.entityService.update(LINK_UID, existing[0].id, {
            data: { end_date: end, metadata: metadata ?? existing[0].metadata, last_refresh_date: now },
          });
          updated++;
        } else {
          await strapi.entityService.create(LINK_UID, {
            data: { link_type: linkType, source_id: Number(sourceId), target_id: Number(targetId), start_date: start, end_date: end, metadata: metadata || null, last_refresh_date: now },
          });
          created++;
        }
      } catch (err) {
        errors.push({ item, error: err.message });
      }
    }

    return { created, updated, errors };
  },

  /** Update dates / metadata of an existing link. */
  async updateLink(id, { startDate, endDate, metadata } = {}) {
    const existing = await strapi.entityService.findOne(LINK_UID, id);
    if (!existing) throw new Error(`Temporal link with id ${id} not found.`);

    const payload = { last_refresh_date: new Date().toISOString() };
    if (startDate !== undefined) payload.start_date = normalizeStartDate(startDate);
    if (endDate   !== undefined) payload.end_date   = normalizeEndDate(endDate);
    if (metadata  !== undefined) payload.metadata   = metadata;

    const start = payload.start_date || existing.start_date;
    const end   = payload.end_date   || existing.end_date;
    if (start > end) throw new Error(`start_date (${start}) must not be after end_date (${end}).`);

    return strapi.entityService.update(LINK_UID, id, { data: payload });
  },

  /**
   * Terminate a link by setting end_date (defaults to today).
   * Use this instead of deleteLink to preserve history.
   */
  async terminateLink(id, endDate) {
    const end = toDateString(endDate || new Date());
    const existing = await strapi.entityService.findOne(LINK_UID, id);
    if (!existing) throw new Error(`Temporal link with id ${id} not found.`);
    if (end < existing.start_date) {
      throw new Error(`end_date (${end}) must not be before start_date (${existing.start_date}).`);
    }
    return strapi.entityService.update(LINK_UID, id, {
      data: { end_date: end, last_refresh_date: new Date().toISOString() },
    });
  },

  /** Permanently delete a link record. */
  async deleteLink(id) {
    const existing = await strapi.entityService.findOne(LINK_UID, id);
    if (!existing) throw new Error(`Temporal link with id ${id} not found.`);
    return strapi.entityService.delete(LINK_UID, id);
  },

  // ═══════════════════════════════════════════════════════════════════════════
  //  BIDIRECTIONAL QUERIES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * SOURCE → TARGET (forward direction)
   * "Given bedrijf X, which groep(en) is it in on [date]?"
   *
   * @param {string} linkType  – e.g. "bedrijven_groepen_range"
   * @param {number} sourceId  – e.g. bedrijf_id = 214
   * @param {string|Date} [date]  – defaults to today
   * @returns {Promise<Array<object>>}
   */
  async getActiveLinksFromSource(linkType, sourceId, date) {
    if (!linkType || !sourceId) throw new Error('linkType and sourceId are required.');
    return strapi.entityService.findMany(LINK_UID, {
      filters: { link_type: linkType, source_id: Number(sourceId), ...activeOnDate(date) },
      sort: { start_date: 'asc' },
    });
  },

  /**
   * TARGET → SOURCE (reverse / bidirectional direction)
   * "Given groep Y, which bedrijven belong to it on [date]?"
   *
   * @param {string} linkType  – e.g. "bedrijven_groepen_range"
   * @param {number} targetId  – e.g. groep_id = 78
   * @param {string|Date} [date]  – defaults to today
   * @returns {Promise<Array<object>>}
   */
  async getActiveLinksFromTarget(linkType, targetId, date) {
    if (!linkType || !targetId) throw new Error('linkType and targetId are required.');
    return strapi.entityService.findMany(LINK_UID, {
      filters: { link_type: linkType, target_id: Number(targetId), ...activeOnDate(date) },
      sort: { start_date: 'asc' },
    });
  },

  /**
   * FULL HISTORY — SOURCE → TARGET
   * All links (past, present and future) for a source entity, ordered by start_date.
   * "Show me every groep bedrijf 214 has ever belonged to."
   *
   * @param {string} linkType
   * @param {number} sourceId
   * @returns {Promise<Array<object>>}
   */
  async getSourceHistory(linkType, sourceId) {
    if (!linkType || !sourceId) throw new Error('linkType and sourceId are required.');
    return strapi.entityService.findMany(LINK_UID, {
      filters: { link_type: linkType, source_id: Number(sourceId) },
      sort: { start_date: 'asc' },
    });
  },

  /**
   * FULL HISTORY — TARGET → SOURCES
   * All entities that have ever been linked to a target.
   * "Show me every bedrijf that has ever been in groep 78."
   *
   * @param {string} linkType
   * @param {number} targetId
   * @returns {Promise<Array<object>>}
   */
  async getTargetHistory(linkType, targetId) {
    if (!linkType || !targetId) throw new Error('linkType and targetId are required.');
    return strapi.entityService.findMany(LINK_UID, {
      filters: { link_type: linkType, target_id: Number(targetId) },
      sort: { start_date: 'asc' },
    });
  },

  /**
   * Links overlapping a date range, from either side (or both).
   *
   * @param {object} params
   * @param {string} params.linkType
   * @param {string|Date} params.rangeStart
   * @param {string|Date} params.rangeEnd
   * @param {number} [params.sourceId]
   * @param {number} [params.targetId]
   * @returns {Promise<Array<object>>}
   */
  async getLinksByDateRange({ linkType, rangeStart, rangeEnd, sourceId, targetId }) {
    if (!linkType || !rangeStart || !rangeEnd) throw new Error('linkType, rangeStart and rangeEnd are required.');
    const start = toDateString(rangeStart);
    const end   = toDateString(rangeEnd);
    const filters = { link_type: linkType, ...overlapsRange(start, end) };
    if (sourceId) filters.source_id = Number(sourceId);
    if (targetId) filters.target_id = Number(targetId);
    return strapi.entityService.findMany(LINK_UID, { filters, sort: { start_date: 'asc' } });
  },

  // ═══════════════════════════════════════════════════════════════════════════
  //  PAGINATED LIST (for admin UI)
  // ═══════════════════════════════════════════════════════════════════════════

  async findLinks({ page = 1, pageSize = 25, filters = {}, sort = { start_date: 'desc' } } = {}) {
    return strapi.entityService.findPage(LINK_UID, { page, pageSize, filters, sort });
  },
});

