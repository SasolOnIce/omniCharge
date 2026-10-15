const fs = require('node:fs/promises');
const path = require('node:path');
const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');

const SERVICE_CLASS = 'com.omnicharge.pos.nfc.PaymentRequestHostApduService';

function withHceManifest(config) {
  return withAndroidManifest(config, (modConfig) => {
    const manifest = modConfig.modResults.manifest;
    const application = manifest.application?.[0];
    if (!application) throw new Error('Android application manifest entry is missing');

    manifest['uses-feature'] ??= [];
    if (!manifest['uses-feature'].some((feature) => feature.$['android:name'] === 'android.hardware.nfc')) {
      manifest['uses-feature'].push({
        $: { 'android:name': 'android.hardware.nfc', 'android:required': 'false' },
      });
    }

    application.service ??= [];
    if (!application.service.some((service) => service.$['android:name'] === SERVICE_CLASS)) {
      application.service.push({
        $: {
          'android:name': SERVICE_CLASS,
          'android:exported': 'true',
          'android:permission': 'android.permission.BIND_NFC_SERVICE',
        },
        'intent-filter': [
          {
            action: [{ $: { 'android:name': 'android.nfc.cardemulation.action.HOST_APDU_SERVICE' } }],
          },
        ],
        'meta-data': [
          {
            $: {
              'android:name': 'android.nfc.cardemulation.host_apdu_service',
              'android:resource': '@xml/omnicharge_hce_service',
            },
          },
        ],
      });
    }

    return modConfig;
  });
}

function withHceService(config) {
  return withDangerousMod(config, [
    'android',
    async (modConfig) => {
      const androidRoot = modConfig.modRequest.platformProjectRoot;
      const javaDir = path.join(androidRoot, 'app/src/main/java/com/omnicharge/pos/nfc');
      const xmlDir = path.join(androidRoot, 'app/src/main/res/xml');
      await fs.mkdir(javaDir, { recursive: true });
      await fs.mkdir(xmlDir, { recursive: true });

      await fs.copyFile(
        path.join(__dirname, 'PaymentRequestHostApduService.kt'),
        path.join(javaDir, 'PaymentRequestHostApduService.kt'),
      );
      await fs.writeFile(
        path.join(xmlDir, 'omnicharge_hce_service.xml'),
        `<?xml version="1.0" encoding="utf-8"?>
<host-apdu-service xmlns:android="http://schemas.android.com/apk/res/android"
    android:description="@string/app_name"
    android:requireDeviceUnlock="true">
    <aid-group android:category="other" android:description="@string/app_name">
        <aid-filter android:name="F0010203040506" />
    </aid-group>
</host-apdu-service>
`,
      );
      return modConfig;
    },
  ]);
}

module.exports = (config) => withHceService(withHceManifest(config));
