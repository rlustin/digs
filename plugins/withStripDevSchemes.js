const { withInfoPlist } = require("expo/config-plugins");

/** Remove `exp+<slug>` URL schemes added by expo-dev-client. */
const withStripDevSchemes = (config) => {
  return withInfoPlist(config, (cfg) => {
    const urlTypes = cfg.modResults.CFBundleURLTypes ?? [];
    cfg.modResults.CFBundleURLTypes = urlTypes.filter((urlType) => {
      const schemes = urlType.CFBundleURLSchemes ?? [];
      return !schemes.every((s) => s.startsWith("exp+"));
    });
    return cfg;
  });
};

module.exports = withStripDevSchemes;
