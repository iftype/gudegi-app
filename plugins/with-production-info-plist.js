const { withInfoPlist } = require('expo/config-plugins');

module.exports = function withProductionInfoPlist(config) {
  return withInfoPlist(config, (modConfig) => {
    if (process.env.EAS_BUILD_PROFILE !== 'production') return modConfig;

    const plist = modConfig.modResults;
    if (Array.isArray(plist.NSBonjourServices)) {
      plist.NSBonjourServices = plist.NSBonjourServices.filter(
        (service) => service !== '_expo._tcp',
      );
      if (plist.NSBonjourServices.length === 0) delete plist.NSBonjourServices;
    }
    if (
      typeof plist.NSLocalNetworkUsageDescription === 'string' &&
      plist.NSLocalNetworkUsageDescription.includes('Expo Dev Launcher')
    ) {
      delete plist.NSLocalNetworkUsageDescription;
    }

    return modConfig;
  });
};
