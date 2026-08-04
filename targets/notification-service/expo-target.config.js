/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = () => ({
  type: 'notification-service',
  name: 'GudegiNotificationService',
  displayName: '구데기 알림 이미지',
  bundleIdentifier: '.notification-service',
  deploymentTarget: '15.1',
  entitlements: {},
});
