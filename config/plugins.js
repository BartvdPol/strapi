'use strict';

module.exports = ({ env }) => ({
  // Built-in plugins
  'users-permissions': {
    config: {
      jwt: {
        expiresIn: '7d',
      },
    },
  },
  // Custom plugin
  'temporal-relations': {
    enabled: true,
    resolve: './src/plugins/temporal-relations',
  },
});
