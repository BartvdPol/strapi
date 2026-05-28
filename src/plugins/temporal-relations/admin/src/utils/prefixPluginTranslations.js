export function prefixPluginTranslations(translations, pluginId) {
  if (!pluginId) {
    throw new TypeError("pluginId can't be empty");
  }

  return Object.keys(translations).reduce((result, key) => {
    result[`${pluginId}.${key}`] = translations[key];
    return result;
  }, {});
}