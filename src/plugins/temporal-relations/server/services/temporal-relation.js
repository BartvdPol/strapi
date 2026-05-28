'use strict';

const OPEN_START = '0001-01-01';
const OPEN_END = '2999-12-31';
const TABLE_PREFIX = 'temporal_links_';
const LEGACY_LINK_UID = 'plugin::temporal-relations.temporal-link';

function hasSqlEngine(strapi) {
  return Boolean(strapi?.db?.connection);
}

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

function sanitizeIdentifier(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_{2,}/g, '_')
    .slice(0, 48);
}

function uidToEntityName(uid) {
  const right = String(uid || '').split('::')[1] || String(uid || 'entity');
  const parts = right.split('.');
  return sanitizeIdentifier(parts[parts.length - 1] || 'entity') || 'entity';
}

function uidToEntityKey(uid) {
  return `${uidToEntityName(uid)}_id`;
}

function uidToSideKey(uid, side) {
  const base = uidToEntityName(uid);
  if (side === 'source') return `source_${base}_id`;
  if (side === 'target') return `target_${base}_id`;
  return `${base}_id`;
}

function stripDirectionPrefixes(value) {
  return String(value || '')
    .replace(/^source_/, '')
    .replace(/^target_/, '')
    .replace(/^bron_/, '')
    .replace(/^ontvanger_/, '');
}

function keyToUid(key) {
  if (!key || !key.endsWith('_id')) return null;
  const base = stripDirectionPrefixes(key.slice(0, -3));
  return `api::${base}.${base}`;
}

function tableNameForTypeName(name) {
  return `${TABLE_PREFIX}${sanitizeIdentifier(name) || 'link_type'}`;
}

function typeNameForTableName(tableName) {
  return String(tableName || '').replace(TABLE_PREFIX, '');
}

function parseMetadata(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function metadataToDb(value) {
  if (value === undefined || value === null) return null;
  return typeof value === 'string' ? value : JSON.stringify(value);
}

function isDataTableName(name) {
  return String(name || '').startsWith(TABLE_PREFIX);
}

async function listTypeTableNames(knex) {
  const names = [];
  const client = String(knex.client.config.client || '').toLowerCase();

  if (client.includes('sqlite')) {
    const rows = await knex('sqlite_master').select('name').where({ type: 'table' });
    rows.forEach((row) => {
      if (isDataTableName(row.name)) names.push(row.name);
    });
    return names.sort();
  }

  const rows = await knex('information_schema.tables')
    .select('table_name')
    .where({ table_schema: 'public', table_type: 'BASE TABLE' });
  rows.forEach((row) => {
    if (isDataTableName(row.table_name)) names.push(row.table_name);
  });
  return names.sort();
}

async function inferTypeConfigFromTable(knex, tableName) {
  const columns = await knex(tableName).columnInfo();
  const idColumns = Object.keys(columns).filter((name) => name.endsWith('_id') && name !== 'id');
  if (idColumns.length < 2) return null;

  return {
    id: typeNameForTableName(tableName),
    name: typeNameForTableName(tableName),
    table_name: tableName,
    source_key: idColumns[0],
    target_key: idColumns[1],
    source_uid: keyToUid(idColumns[0]),
    target_uid: keyToUid(idColumns[1]),
    source_label: idColumns[0].replace(/_id$/, ''),
    target_label: idColumns[1].replace(/_id$/, ''),
    description: null,
  };
}

async function findTypeConfigByName(knex, typeName) {
  const tableName = tableNameForTypeName(typeName);
  const exists = await knex.schema.hasTable(tableName);
  if (!exists) return null;
  return inferTypeConfigFromTable(knex, tableName);
}

async function ensureTypeTable(knex, { tableName, sourceKey, targetKey }) {
  const exists = await knex.schema.hasTable(tableName);
  if (exists) return;

  await knex.schema.createTable(tableName, (table) => {
    table.increments('id').primary();
    table.integer(sourceKey).notNullable();
    table.integer(targetKey).notNullable();
    table.string('start_date', 10).notNullable();
    table.string('end_date', 10).notNullable();
    table.text('metadata').nullable();
    table.datetime('last_refresh_date').nullable();
    table.datetime('created_at').defaultTo(knex.fn.now());
    table.datetime('updated_at').defaultTo(knex.fn.now());
    table.unique([sourceKey, targetKey, 'start_date'], `${tableName}_uniq_pair_start`);
    table.index([sourceKey], `${tableName}_${sourceKey}_idx`);
    table.index([targetKey], `${tableName}_${targetKey}_idx`);
    table.index(['start_date', 'end_date'], `${tableName}_dates_idx`);
  });
}

function normalizeRow(row, config) {
  return {
    id: row.id,
    link_type: config.name,
    source_id: row[config.source_key],
    target_id: row[config.target_key],
    [config.source_key]: row[config.source_key],
    [config.target_key]: row[config.target_key],
    start_date: row.start_date,
    end_date: row.end_date,
    metadata: parseMetadata(row.metadata),
    last_refresh_date: row.last_refresh_date || null,
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
  };
}

function applyDateFilters(query, { date, rangeStart, rangeEnd }) {
  if (date) {
    const d = toDateString(date);
    query.where('start_date', '<=', d).where('end_date', '>=', d);
  }

  if (rangeStart && rangeEnd) {
    const start = toDateString(rangeStart);
    const end = toDateString(rangeEnd);
    query.where('start_date', '<=', end).where('end_date', '>=', start);
  }
}

module.exports = ({ strapi }) => ({
  async listLinkTypes() {
    if (!hasSqlEngine(strapi)) return [];
    const knex = strapi.db.connection;
    const tableNames = await listTypeTableNames(knex);
    const configs = await Promise.all(tableNames.map((name) => inferTypeConfigFromTable(knex, name)));
    return configs.filter(Boolean).sort((a, b) => a.name.localeCompare(b.name));
  },

  async createLinkType({ name, sourceUid, targetUid, sourceKey, targetKey }) {
    if (!hasSqlEngine(strapi)) {
      const sameEntity = Boolean(sourceUid && targetUid && sourceUid === targetUid);
      return {
        id: name,
        name,
        source_key: sanitizeIdentifier(sourceKey || (sameEntity ? uidToSideKey(sourceUid, 'source') : uidToEntityKey(sourceUid))),
        target_key: sanitizeIdentifier(targetKey || (sameEntity ? uidToSideKey(targetUid, 'target') : uidToEntityKey(targetUid))),
      };
    }
    if (!name) throw new Error('name is required.');

    const sameEntity = Boolean(sourceUid && targetUid && sourceUid === targetUid);
    const resolvedSourceKey = sanitizeIdentifier(sourceKey || (sameEntity ? uidToSideKey(sourceUid, 'source') : uidToEntityKey(sourceUid)));
    const resolvedTargetKey = sanitizeIdentifier(targetKey || (sameEntity ? uidToSideKey(targetUid, 'target') : uidToEntityKey(targetUid)));
    if (!resolvedSourceKey || !resolvedTargetKey) {
      throw new Error('sourceUid/targetUid or sourceKey/targetKey are required.');
    }
    if (resolvedSourceKey === resolvedTargetKey) {
      throw new Error('source and target keys must be different. For same-entity links, use distinct keys like source_bedrijf_id and target_bedrijf_id.');
    }

    const tableName = tableNameForTypeName(name);
    const knex = strapi.db.connection;
    await ensureTypeTable(knex, { tableName, sourceKey: resolvedSourceKey, targetKey: resolvedTargetKey });

    return {
      id: typeNameForTableName(tableName),
      name: typeNameForTableName(tableName),
      table_name: tableName,
      source_key: resolvedSourceKey,
      target_key: resolvedTargetKey,
      source_uid: keyToUid(resolvedSourceKey),
      target_uid: keyToUid(resolvedTargetKey),
      source_label: resolvedSourceKey.replace(/_id$/, ''),
      target_label: resolvedTargetKey.replace(/_id$/, ''),
      description: null,
    };
  },

  async getLinkType(name) {
    if (!hasSqlEngine(strapi)) return null;
    return findTypeConfigByName(strapi.db.connection, name);
  },

  async updateLinkType(id, { sourceUid, targetUid, sourceKey, targetKey } = {}) {
    if (!hasSqlEngine(strapi)) {
      const sameEntity = Boolean(sourceUid && targetUid && sourceUid === targetUid);
      const nextSourceKey = sanitizeIdentifier(sourceKey || (sameEntity ? uidToSideKey(sourceUid, 'source') : uidToEntityKey(sourceUid)));
      const nextTargetKey = sanitizeIdentifier(targetKey || (sameEntity ? uidToSideKey(targetUid, 'target') : uidToEntityKey(targetUid)));
      return {
        id,
        name: id,
        source_key: nextSourceKey,
        target_key: nextTargetKey,
      };
    }
    const current = await findTypeConfigByName(strapi.db.connection, id);
    if (!current) throw new Error(`Link type with id ${id} not found.`);

    const sameEntity = Boolean(sourceUid && targetUid && sourceUid === targetUid);
    const nextSourceKey = sanitizeIdentifier(sourceKey || (sourceUid ? (sameEntity ? uidToSideKey(sourceUid, 'source') : uidToEntityKey(sourceUid)) : current.source_key));
    const nextTargetKey = sanitizeIdentifier(targetKey || (targetUid ? (sameEntity ? uidToSideKey(targetUid, 'target') : uidToEntityKey(targetUid)) : current.target_key));

    if (nextSourceKey === nextTargetKey) {
      throw new Error('source and target keys must be different.');
    }

    if (nextSourceKey === current.source_key && nextTargetKey === current.target_key) {
      return current;
    }

    throw new Error('Changing source/target columns is not supported after table creation. Create a new link type instead.');
  },

  async deleteLinkType(id) {
    if (!hasSqlEngine(strapi)) return { id };
    const tableName = tableNameForTypeName(id);
    const knex = strapi.db.connection;
    const exists = await knex.schema.hasTable(tableName);
    if (!exists) throw new Error(`Link type with id ${id} not found.`);
    await knex.schema.dropTable(tableName);
    return { id };
  },

  async createLink({ linkType, sourceId, targetId, startDate, endDate, metadata }) {
    if (!linkType || sourceId === undefined || targetId === undefined) {
      throw new Error('linkType, sourceId and targetId are required.');
    }

    if (!hasSqlEngine(strapi)) {
      const start = normalizeStartDate(startDate);
      const end = normalizeEndDate(endDate);
      if (start > end) throw new Error(`start_date (${start}) must not be after end_date (${end}).`);
      return strapi.entityService.create(LEGACY_LINK_UID, {
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
    }

    const config = await findTypeConfigByName(strapi.db.connection, linkType);
    if (!config) throw new Error(`Unknown linkType: ${linkType}`);

    const start = normalizeStartDate(startDate);
    const end = normalizeEndDate(endDate);
    if (start > end) throw new Error(`start_date (${start}) must not be after end_date (${end}).`);

    const now = new Date().toISOString();
    const payload = {
      [config.source_key]: Number(sourceId),
      [config.target_key]: Number(targetId),
      start_date: start,
      end_date: end,
      metadata: metadataToDb(metadata),
      last_refresh_date: now,
      updated_at: now,
    };

    const inserted = await strapi.db.connection(config.table_name).insert(payload);
    const id = Array.isArray(inserted) ? inserted[0] : inserted;
    const row = await strapi.db.connection(config.table_name).where({ id }).first();
    return normalizeRow(row, config);
  },

  async importLinks(linkType, links) {
    if (!linkType) throw new Error('linkType is required.');
    if (!Array.isArray(links) || links.length === 0) throw new Error('links must be a non-empty array.');

    if (!hasSqlEngine(strapi)) {
      let created = 0;
      let updated = 0;
      const errors = [];
      const now = new Date().toISOString();

      for (const item of links) {
        try {
          const start = normalizeStartDate(item.startDate);
          const end = normalizeEndDate(item.endDate);
          const existing = await strapi.entityService.findMany(LEGACY_LINK_UID, {
            filters: {
              link_type: linkType,
              source_id: Number(item.sourceId),
              target_id: Number(item.targetId),
              start_date: start,
            },
            limit: 1,
          });

          if (existing.length > 0) {
            await strapi.entityService.update(LEGACY_LINK_UID, existing[0].id, {
              data: {
                end_date: end,
                metadata: item.metadata !== undefined ? item.metadata : existing[0].metadata,
                last_refresh_date: now,
              },
            });
            updated++;
          } else {
            await strapi.entityService.create(LEGACY_LINK_UID, {
              data: {
                link_type: linkType,
                source_id: Number(item.sourceId),
                target_id: Number(item.targetId),
                start_date: start,
                end_date: end,
                metadata: item.metadata || null,
                last_refresh_date: now,
              },
            });
            created++;
          }
        } catch (err) {
          errors.push({ item, error: err.message });
        }
      }

      return { created, updated, errors };
    }

    const config = await findTypeConfigByName(strapi.db.connection, linkType);
    if (!config) throw new Error(`Unknown linkType: ${linkType}`);

    let created = 0;
    let updated = 0;
    const errors = [];
    const now = new Date().toISOString();

    for (const item of links) {
      try {
        const start = normalizeStartDate(item.startDate);
        const end = normalizeEndDate(item.endDate);

        const existing = await strapi.db.connection(config.table_name)
          .where(config.source_key, Number(item.sourceId))
          .where(config.target_key, Number(item.targetId))
          .where('start_date', start)
          .first();

        if (existing) {
          await strapi.db.connection(config.table_name)
            .where({ id: existing.id })
            .update({
              end_date: end,
              metadata: item.metadata !== undefined ? metadataToDb(item.metadata) : existing.metadata,
              last_refresh_date: now,
              updated_at: now,
            });
          updated++;
        } else {
          await strapi.db.connection(config.table_name).insert({
            [config.source_key]: Number(item.sourceId),
            [config.target_key]: Number(item.targetId),
            start_date: start,
            end_date: end,
            metadata: metadataToDb(item.metadata),
            last_refresh_date: now,
            updated_at: now,
          });
          created++;
        }
      } catch (err) {
        errors.push({ item, error: err.message });
      }
    }

    return { created, updated, errors };
  },

  async updateLink(id, { startDate, endDate, metadata } = {}) {
    if (!hasSqlEngine(strapi)) {
      const existing = await strapi.entityService.findOne(LEGACY_LINK_UID, Number(id));
      if (!existing) throw new Error(`Temporal link with id ${id} not found.`);

      const nextStart = startDate !== undefined ? normalizeStartDate(startDate) : existing.start_date;
      const nextEnd = endDate !== undefined ? normalizeEndDate(endDate) : existing.end_date;
      if (nextStart > nextEnd) throw new Error(`start_date (${nextStart}) must not be after end_date (${nextEnd}).`);

      const payload = {
        start_date: nextStart,
        end_date: nextEnd,
        last_refresh_date: new Date().toISOString(),
      };
      if (metadata !== undefined) payload.metadata = metadata;

      return strapi.entityService.update(LEGACY_LINK_UID, Number(id), { data: payload });
    }

    const linkTypes = await this.listLinkTypes();

    for (const config of linkTypes) {
      const existing = await strapi.db.connection(config.table_name).where({ id: Number(id) }).first();
      if (!existing) continue;

      const nextStart = startDate !== undefined ? normalizeStartDate(startDate) : existing.start_date;
      const nextEnd = endDate !== undefined ? normalizeEndDate(endDate) : existing.end_date;
      if (nextStart > nextEnd) throw new Error(`start_date (${nextStart}) must not be after end_date (${nextEnd}).`);

      const now = new Date().toISOString();
      const payload = {
        start_date: nextStart,
        end_date: nextEnd,
        last_refresh_date: now,
        updated_at: now,
      };
      if (metadata !== undefined) payload.metadata = metadataToDb(metadata);

      await strapi.db.connection(config.table_name).where({ id: Number(id) }).update(payload);
      const row = await strapi.db.connection(config.table_name).where({ id: Number(id) }).first();
      return normalizeRow(row, config);
    }

    throw new Error(`Temporal link with id ${id} not found.`);
  },

  async terminateLink(id, endDate) {
    if (!hasSqlEngine(strapi)) {
      const end = toDateString(endDate || new Date());
      const existing = await strapi.entityService.findOne(LEGACY_LINK_UID, Number(id));
      if (!existing) throw new Error(`Temporal link with id ${id} not found.`);
      if (end < existing.start_date) {
        throw new Error(`end_date (${end}) must not be before start_date (${existing.start_date}).`);
      }
      return strapi.entityService.update(LEGACY_LINK_UID, Number(id), {
        data: { end_date: end, last_refresh_date: new Date().toISOString() },
      });
    }

    const linkTypes = await this.listLinkTypes();
    const end = toDateString(endDate || new Date());

    for (const config of linkTypes) {
      const existing = await strapi.db.connection(config.table_name).where({ id: Number(id) }).first();
      if (!existing) continue;
      if (end < existing.start_date) {
        throw new Error(`end_date (${end}) must not be before start_date (${existing.start_date}).`);
      }

      const now = new Date().toISOString();
      await strapi.db.connection(config.table_name)
        .where({ id: Number(id) })
        .update({ end_date: end, last_refresh_date: now, updated_at: now });

      const row = await strapi.db.connection(config.table_name).where({ id: Number(id) }).first();
      return normalizeRow(row, config);
    }

    throw new Error(`Temporal link with id ${id} not found.`);
  },

  async deleteLink(id) {
    if (!hasSqlEngine(strapi)) {
      const existing = await strapi.entityService.findOne(LEGACY_LINK_UID, Number(id));
      if (!existing) throw new Error(`Temporal link with id ${id} not found.`);
      return strapi.entityService.delete(LEGACY_LINK_UID, Number(id));
    }

    const linkTypes = await this.listLinkTypes();

    for (const config of linkTypes) {
      const existing = await strapi.db.connection(config.table_name).where({ id: Number(id) }).first();
      if (!existing) continue;
      await strapi.db.connection(config.table_name).where({ id: Number(id) }).del();
      return { id: Number(id) };
    }

    throw new Error(`Temporal link with id ${id} not found.`);
  },

  async getActiveLinksFromSource(linkType, sourceId, date) {
    if (!linkType || sourceId === undefined) throw new Error('linkType and sourceId are required.');

    if (!hasSqlEngine(strapi)) {
      const d = toDateString(date || new Date());
      return strapi.entityService.findMany(LEGACY_LINK_UID, {
        filters: {
          link_type: linkType,
          source_id: Number(sourceId),
          start_date: { $lte: d },
          end_date: { $gte: d },
        },
        sort: { start_date: 'asc' },
      });
    }

    const config = await findTypeConfigByName(strapi.db.connection, linkType);
    if (!config) throw new Error(`Unknown linkType: ${linkType}`);

    const query = strapi.db.connection(config.table_name).where(config.source_key, Number(sourceId));
    applyDateFilters(query, { date });
    const rows = await query.orderBy('start_date', 'asc').select('*');
    return rows.map((row) => normalizeRow(row, config));
  },

  async getActiveLinksFromTarget(linkType, targetId, date) {
    if (!linkType || targetId === undefined) throw new Error('linkType and targetId are required.');

    if (!hasSqlEngine(strapi)) {
      const d = toDateString(date || new Date());
      return strapi.entityService.findMany(LEGACY_LINK_UID, {
        filters: {
          link_type: linkType,
          target_id: Number(targetId),
          start_date: { $lte: d },
          end_date: { $gte: d },
        },
        sort: { start_date: 'asc' },
      });
    }

    const config = await findTypeConfigByName(strapi.db.connection, linkType);
    if (!config) throw new Error(`Unknown linkType: ${linkType}`);

    const query = strapi.db.connection(config.table_name).where(config.target_key, Number(targetId));
    applyDateFilters(query, { date });
    const rows = await query.orderBy('start_date', 'asc').select('*');
    return rows.map((row) => normalizeRow(row, config));
  },

  async getSourceHistory(linkType, sourceId) {
    if (!linkType || sourceId === undefined) throw new Error('linkType and sourceId are required.');

    if (!hasSqlEngine(strapi)) {
      return strapi.entityService.findMany(LEGACY_LINK_UID, {
        filters: { link_type: linkType, source_id: Number(sourceId) },
        sort: { start_date: 'asc' },
      });
    }

    const config = await findTypeConfigByName(strapi.db.connection, linkType);
    if (!config) throw new Error(`Unknown linkType: ${linkType}`);

    const rows = await strapi.db.connection(config.table_name)
      .where(config.source_key, Number(sourceId))
      .orderBy('start_date', 'asc')
      .select('*');

    return rows.map((row) => normalizeRow(row, config));
  },

  async getTargetHistory(linkType, targetId) {
    if (!linkType || targetId === undefined) throw new Error('linkType and targetId are required.');

    if (!hasSqlEngine(strapi)) {
      return strapi.entityService.findMany(LEGACY_LINK_UID, {
        filters: { link_type: linkType, target_id: Number(targetId) },
        sort: { start_date: 'asc' },
      });
    }

    const config = await findTypeConfigByName(strapi.db.connection, linkType);
    if (!config) throw new Error(`Unknown linkType: ${linkType}`);

    const rows = await strapi.db.connection(config.table_name)
      .where(config.target_key, Number(targetId))
      .orderBy('start_date', 'asc')
      .select('*');

    return rows.map((row) => normalizeRow(row, config));
  },

  async getLinksByDateRange({ linkType, rangeStart, rangeEnd, sourceId, targetId }) {
    if (!linkType || !rangeStart || !rangeEnd) throw new Error('linkType, rangeStart and rangeEnd are required.');

    if (!hasSqlEngine(strapi)) {
      const start = toDateString(rangeStart);
      const end = toDateString(rangeEnd);
      const filters = {
        link_type: linkType,
        start_date: { $lte: end },
        end_date: { $gte: start },
      };
      if (sourceId !== undefined) filters.source_id = Number(sourceId);
      if (targetId !== undefined) filters.target_id = Number(targetId);
      return strapi.entityService.findMany(LEGACY_LINK_UID, {
        filters,
        sort: { start_date: 'asc' },
      });
    }

    const config = await findTypeConfigByName(strapi.db.connection, linkType);
    if (!config) throw new Error(`Unknown linkType: ${linkType}`);

    const query = strapi.db.connection(config.table_name);
    if (sourceId !== undefined) query.where(config.source_key, Number(sourceId));
    if (targetId !== undefined) query.where(config.target_key, Number(targetId));
    applyDateFilters(query, { rangeStart, rangeEnd });

    const rows = await query.orderBy('start_date', 'asc').select('*');
    return rows.map((row) => normalizeRow(row, config));
  },

  async findLinks({ page = 1, pageSize = 25, filters = {}, sort = { start_date: 'desc' } } = {}) {
    if (!hasSqlEngine(strapi)) {
      return strapi.entityService.findPage(LEGACY_LINK_UID, { page, pageSize, filters, sort });
    }

    const linkType = filters?.link_type;
    if (!linkType) {
      return {
        results: [],
        pagination: { page, pageSize, pageCount: 0, total: 0 },
      };
    }

    const config = await findTypeConfigByName(strapi.db.connection, linkType);
    if (!config) {
      return {
        results: [],
        pagination: { page, pageSize, pageCount: 0, total: 0 },
      };
    }

    const query = strapi.db.connection(config.table_name);
    if (filters.source_id !== undefined) query.where(config.source_key, Number(filters.source_id));
    if (filters.target_id !== undefined) query.where(config.target_key, Number(filters.target_id));

    const sortKey = Object.keys(sort || { start_date: 'desc' })[0] || 'start_date';
    const sortDir = sort?.[sortKey] || 'desc';

    const totalRow = await query.clone().count({ count: 'id' }).first();
    const total = Number(totalRow?.count || 0);
    const offset = Math.max(0, (page - 1) * pageSize);

    const rows = await query
      .clone()
      .orderBy(sortKey, sortDir)
      .offset(offset)
      .limit(pageSize)
      .select('*');

    return {
      results: rows.map((row) => normalizeRow(row, config)),
      pagination: {
        page,
        pageSize,
        pageCount: Math.ceil(total / pageSize) || 0,
        total,
      },
    };
  },
});
