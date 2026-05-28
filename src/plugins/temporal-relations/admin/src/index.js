import React from 'react';
import pluginId from './pluginId';
import PluginIcon from './components/PluginIcon';
import getTrad from './utils/getTrad';
import { prefixPluginTranslations } from './utils/prefixPluginTranslations';
import TemporalBedrijvenPanel from './components/TemporalBedrijvenPanel';
import TemporalBedrijvenByPersoonPanel from './components/TemporalBedrijvenByPersoonPanel';
import TemporalBedrijfToBedrijfPanel from './components/TemporalBedrijfToBedrijfPanel';

export default {
  register(app) {
    app.addMenuLink({
      to: `plugins/${pluginId}`,
      icon: PluginIcon,
      intlLabel: {
        id: getTrad('plugin.name'),
        defaultMessage: 'Temporal Relations',
      },
      Component: () => import('./pages/App'),
    });

    app.registerPlugin({
      id: pluginId,
      name: pluginId,
    });
  },

  bootstrap(app) {
    const cm = app.getPlugin('content-manager');
    if (cm?.apis?.addEditViewSidePanel) {
      cm.apis.addEditViewSidePanel([
        ({ document, model }) => {
          if (model !== 'api::bedrijf.bedrijf') return null;
          const linkId = document?.external_id ?? document?.id;
          if (!linkId) return null;
          return {
            title: 'Relaties (tijdgebonden)',
            content: React.createElement(TemporalBedrijfToBedrijfPanel, { bedrijfNumericId: linkId }),
          };
        },
        ({ document, model }) => {
          if (model !== 'api::groep.groep') return null;
          const linkId = document?.external_id ?? document?.id;
          if (!linkId) return null;
          return {
            title: 'Bedrijven (tijdgebonden)',
            content: React.createElement(TemporalBedrijvenPanel, { groepNumericId: linkId }),
          };
        },
        ({ document, model }) => {
          if (model !== 'api::persoon.persoon') return null;
          const linkId = document?.external_id ?? document?.id;
          if (!linkId) return null;
          return {
            title: 'Bedrijven (tijdgebonden)',
            content: React.createElement(TemporalBedrijvenByPersoonPanel, { persoonNumericId: linkId }),
          };
        },
      ]);
    }
  },

  async registerTrads({ locales }) {
    const importedTrads = await Promise.all(
      locales.map((locale) => {
        return import(`./translations/${locale}.json`)
          .then(({ default: data }) => ({ data: prefixPluginTranslations(data, pluginId), locale }))
          .catch(() => ({ data: {}, locale }));
      })
    );
    return importedTrads;
  },
};
