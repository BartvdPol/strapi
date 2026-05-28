'use strict';

/**
 * temporal-link content type
 *
 * Each row represents a time-bounded relationship between two entities.
 *
 *   link_type  – name of the temporal-link-type that defines which content
 *                types are on either side (e.g. "bedrijven_groepen_range")
 *   source_id  – PK of the "source" entity (e.g. bedrijf_id)
 *   target_id  – PK of the "target" entity (e.g. groep_id)
 *
 * The relation is BIDIRECTIONAL: a link can be queried from either side.
 * A link is active on date D when  start_date <= D <= end_date.
 */
module.exports = {
  kind: 'collectionType',
  collectionName: 'temporal_links',
  info: {
    singularName: 'temporal-link',
    pluralName: 'temporal-links',
    displayName: 'Temporal Link',
    description: 'Time-bounded bidirectional relation between two entities',
  },
  options: {
    draftAndPublish: false,
    populateCreatorFields: false,
  },
  pluginOptions: {
    'content-manager': { visible: true },
    'content-type-builder': { visible: false },
  },
  attributes: {
    // References the name field of temporal-link-type
    link_type: {
      type: 'string',
      required: true,
      maxLength: 255,
    },
    // PK on the source side (e.g. bedrijf_id)
    source_id: {
      type: 'integer',
      required: true,
    },
    // PK on the target side (e.g. groep_id)
    target_id: {
      type: 'integer',
      required: true,
    },
    start_date: {
      type: 'date',
      required: true,
    },
    end_date: {
      type: 'date',
      required: true,
    },
    metadata: {
      type: 'json',
    },
    last_refresh_date: {
      type: 'datetime',
    },
  },
};
