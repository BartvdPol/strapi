'use strict';

module.exports = {
  type: 'content-api',
  routes: [

    // ══════════════════════════════════════════════════════════════════════════
    //  CONTENT HELPERS — fetch related content types without admin auth
    // ══════════════════════════════════════════════════════════════════════════

    {
      method: 'GET',
      path: '/groepen',
      handler: 'temporal-relation.listGroepen',
      config: { auth: false, description: 'List all groepen (id + naam) for panel UI' },
    },
    {
      method: 'GET',
      path: '/bedrijven',
      handler: 'temporal-relation.listBedrijven',
      config: { auth: false, description: 'List all bedrijven (id + naam) for panel UI' },
    },
    {
      method: 'GET',
      path: '/personen',
      handler: 'temporal-relation.listPersonen',
      config: { auth: false, description: 'List all personen (id + username) for panel UI' },
    },

    // ══════════════════════════════════════════════════════════════════════════
    //  LINK TYPES — define which content types are related
    // ══════════════════════════════════════════════════════════════════════════

    {
      method: 'GET',
      path: '/link-types',
      handler: 'temporal-relation.listLinkTypes',
      config: { auth: false, description: 'List all named relation types' },
    },
    {
      method: 'POST',
      path: '/link-types',
      handler: 'temporal-relation.createLinkType',
      config: {
        auth: false,
        description: 'Define a new bidirectional temporal relation type, e.g. bedrijven_groepen_range',
      },
    },
    {
      method: 'PUT',
      path: '/link-types/:id',
      handler: 'temporal-relation.updateLinkType',
      config: { auth: false, description: 'Update a relation type definition' },
    },
    {
      method: 'DELETE',
      path: '/link-types/:id',
      handler: 'temporal-relation.deleteLinkType',
      config: { auth: false, description: 'Delete a relation type definition' },
    },

    // ══════════════════════════════════════════════════════════════════════════
    //  LINKS — bidirectional query endpoints (must be before /:id routes)
    // ══════════════════════════════════════════════════════════════════════════

    {
      method: 'GET',
      path: '/links/from-source',
      handler: 'temporal-relation.getActiveLinksFromSource',
      config: {
        auth: false,
        description: [
          'SOURCE → TARGET (forward): active links on a date.',
          '?linkType=bedrijven_groepen_range&sourceId=214&date=2025-05-01',
          '"Which groep does bedrijf 214 belong to on that date?"',
        ].join(' '),
      },
    },
    {
      method: 'GET',
      path: '/links/from-target',
      handler: 'temporal-relation.getActiveLinksFromTarget',
      config: {
        auth: false,
        description: [
          'TARGET → SOURCES (reverse/bidirectional): active links on a date.',
          '?linkType=bedrijven_groepen_range&targetId=78&date=2025-05-01',
          '"Which bedrijven belong to groep 78 on that date?"',
        ].join(' '),
      },
    },
    {
      method: 'GET',
      path: '/links/source-history',
      handler: 'temporal-relation.getSourceHistory',
      config: {
        auth: false,
        description: 'Full history for a source entity. ?linkType=...&sourceId=214',
      },
    },
    {
      method: 'GET',
      path: '/links/target-history',
      handler: 'temporal-relation.getTargetHistory',
      config: {
        auth: false,
        description: 'Full history for a target entity. ?linkType=...&targetId=78',
      },
    },
    {
      method: 'GET',
      path: '/links/range',
      handler: 'temporal-relation.getLinksByDateRange',
      config: {
        auth: false,
        description: 'Links overlapping a date range. ?linkType=...&rangeStart=...&rangeEnd=...',
      },
    },

    // ══════════════════════════════════════════════════════════════════════════
    //  LINKS — CRUD
    // ══════════════════════════════════════════════════════════════════════════

    {
      method: 'GET',
      path: '/links',
      handler: 'temporal-relation.findLinks',
      config: { auth: false, description: 'Paginated list with optional filters' },
    },
    {
      method: 'POST',
      path: '/links',
      handler: 'temporal-relation.createLink',
      config: { auth: false, description: 'Create a single time-bounded link' },
    },
    {
      method: 'POST',
      path: '/links/import',
      handler: 'temporal-relation.importLinks',
      config: { auth: false, description: 'Bulk upsert links (matches SQL INSERT pattern)' },
    },
    {
      method: 'PUT',
      path: '/links/:id',
      handler: 'temporal-relation.updateLink',
      config: { auth: false, description: 'Update start_date, end_date or metadata' },
    },
    {
      method: 'POST',
      path: '/links/:id/terminate',
      handler: 'temporal-relation.terminateLink',
      config: { auth: false, description: 'Close a link by setting end_date (preserves history)' },
    },
    {
      method: 'DELETE',
      path: '/links/:id',
      handler: 'temporal-relation.deleteLink',
      config: { auth: false, description: 'Permanently delete a link record' },
    },
  ],
};

