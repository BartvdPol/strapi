'use strict';

const temporalLink     = require('./temporal-link/schema');
const temporalLinkType = require('./temporal-link-type/schema');

module.exports = {
  'temporal-link':      { schema: temporalLink },
  'temporal-link-type': { schema: temporalLinkType },
};
