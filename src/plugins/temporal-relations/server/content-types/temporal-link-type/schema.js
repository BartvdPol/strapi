'use strict';

/**
 * temporal-link-type content type
 *
 * Defines a named, bidirectional relation between two Strapi content types.
 * Example: "bedrijven_groepen_range" links  api::bedrijf.bedrijf  ↔  api::groep.groep
 */
module.exports = {
  kind: 'collectionType',
  collectionName: 'temporal_link_types',
  info: {
    singularName: 'temporal-link-type',
    pluralName: 'temporal-link-types',
    displayName: 'Temporal Link Type',
    description: 'Named bidirectional relation type between two content types',
  },
  options: {
    draftAndPublish: false,
  },
  pluginOptions: {
    'content-manager': { visible: true },
    'content-type-builder': { visible: false },
  },
  attributes: {
    // Unique machine name, e.g. "bedrijven_groepen_range"
    name: {
      type: 'string',
      required: true,
      unique: true,
      maxLength: 255,
    },
    // Strapi UID of the source content type, e.g. "api::bedrijf.bedrijf"
    source_uid: {
      type: 'string',
      required: true,
      maxLength: 255,
    },
    // Strapi UID of the target content type, e.g. "api::groep.groep"
    target_uid: {
      type: 'string',
      required: true,
      maxLength: 255,
    },
    // Human-readable label for the source side, e.g. "Bedrijf"
    source_label: {
      type: 'string',
      maxLength: 255,
    },
    // Human-readable label for the target side, e.g. "Groep"
    target_label: {
      type: 'string',
      maxLength: 255,
    },
    description: {
      type: 'text',
    },
  },
};
