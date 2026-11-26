package com.hamko.erp;

import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.content.pm.PackageInfoCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  private static final String PREFS_NAME = "hamko_webview_cache_guard";
  private static final String KEY_LAST_VERSION = "last_synced_version";

  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    purgeStaleWebViewResourceCacheOnUpgrade();
  }

  /**
   * Clears stale Android WebView HTTP/resource disk cache once per app version upgrade
   * so updated React/Vite bundles take effect immediately, while preserving localStorage
   * auth sessions and Capacitor Filesystem offline data.
   */
  private void purgeStaleWebViewResourceCacheOnUpgrade() {
    try {
      if (this.bridge == null || this.bridge.getWebView() == null) return;
      WebView webView = this.bridge.getWebView();
      WebSettings settings = webView.getSettings();
      settings.setCacheMode(WebSettings.LOAD_DEFAULT);

      PackageInfo pInfo = getPackageManager().getPackageInfo(getPackageName(), 0);
      String currentVersion = pInfo.versionName + "-" + PackageInfoCompat.getLongVersionCode(pInfo);

      SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
      String lastVersion = prefs.getString(KEY_LAST_VERSION, "");
      if (!currentVersion.equals(lastVersion)) {
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        webView.clearCache(true);
        webView.clearHistory();
        prefs.edit().putString(KEY_LAST_VERSION, currentVersion).apply();
      }
    } catch (Exception ignored) {
      // Fail-safe: never block WebView launch
    }
  }
}
