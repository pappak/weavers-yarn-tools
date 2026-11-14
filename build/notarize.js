// Notarization for the direct-distribution .dmg (Developer ID build).
// Runs automatically after signing when these environment variables are set:
//   APPLE_ID            your Apple ID email
//   APPLE_APP_SPECIFIC_PASSWORD   app-specific password (appleid.apple.com)
//   APPLE_TEAM_ID       your Team ID from developer.apple.com membership
// If the variables are absent (e.g. no credentials yet), notarization is skipped.
exports.default = async function notarizing(context) {
    const { APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID } = process.env;
    if (!APPLE_ID || !APPLE_APP_SPECIFIC_PASSWORD || !APPLE_TEAM_ID) {
        console.log('Notarization skipped: APPLE_ID / APPLE_APP_SPECIFIC_PASSWORD / APPLE_TEAM_ID not set');
        return;
    }
    const { notarize } = require('@electron/notarize');
    const appPath = context.packager.appInfo.electronAssemblerAppPath || context.artifactsPaths?.[0];
    console.log('Notarizing', appPath);
    return await notarize({
        tool: 'notarytool',
        appPath,
        appleId: APPLE_ID,
        appleIdPassword: APPLE_APP_SPECIFIC_PASSWORD,
        teamId: APPLE_TEAM_ID
    });
};
