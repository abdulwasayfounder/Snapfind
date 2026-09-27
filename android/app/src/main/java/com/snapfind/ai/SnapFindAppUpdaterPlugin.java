package com.snapfind.ai;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.util.Log;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

@CapacitorPlugin(name = "SnapFindAppUpdater")
public class SnapFindAppUpdaterPlugin extends Plugin {
    private static final String TAG = "SnapFindAppUpdater";
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private volatile boolean isDownloading = false;
    private volatile boolean cancelRequested = false;

    @PluginMethod
    public void getAppVersion(PluginCall call) {
        try {
            Context context = getContext();
            PackageManager pm = context.getPackageManager();
            PackageInfo pInfo = pm.getPackageInfo(context.getPackageName(), 0);

            long versionCode;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                versionCode = pInfo.getLongVersionCode();
            } else {
                versionCode = pInfo.versionCode;
            }

            JSObject ret = new JSObject();
            ret.put("versionName", pInfo.versionName != null ? pInfo.versionName : "1.0.0");
            ret.put("versionCode", versionCode);
            ret.put("packageName", context.getPackageName());
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error retrieving app version", e);
            JSObject ret = new JSObject();
            ret.put("versionName", "1.0.0");
            ret.put("versionCode", 1);
            ret.put("packageName", getContext().getPackageName());
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void canRequestPackageInstalls(PluginCall call) {
        JSObject ret = new JSObject();
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                boolean canInstall = getContext().getPackageManager().canRequestPackageInstalls();
                ret.put("granted", canInstall);
            } else {
                ret.put("granted", true);
            }
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error checking package install permission", e);
            ret.put("granted", true);
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void openInstallPermissionSettings(PluginCall call) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
                intent.setData(Uri.parse("package:" + getContext().getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
                call.resolve();
            } else {
                call.resolve();
            }
        } catch (Exception e) {
            Log.e(TAG, "Error opening install permission settings", e);
            call.reject("Could not open install settings: " + e.getMessage());
        }
    }

    @PluginMethod
    public void cancelDownload(PluginCall call) {
        cancelRequested = true;
        isDownloading = false;
        call.resolve();
    }

    @PluginMethod
    public void downloadAndInstallApk(PluginCall call) {
        String downloadUrl = call.getString("url");
        String version = call.getString("version", "update");

        if (downloadUrl == null || downloadUrl.trim().isEmpty()) {
            call.reject("Download URL is required");
            return;
        }

        if (!downloadUrl.startsWith("https://")) {
            call.reject("Insecure download URL: HTTPS is strictly required");
            return;
        }

        if (isDownloading) {
            call.reject("An update download is already in progress");
            return;
        }

        isDownloading = true;
        cancelRequested = false;

        new Thread(() -> {
            HttpURLConnection connection = null;
            InputStream inputStream = null;
            FileOutputStream outputStream = null;

            try {
                Context context = getContext();
                File cacheDir = context.getExternalCacheDir();
                if (cacheDir == null) {
                    cacheDir = context.getCacheDir();
                }

                File updateDir = new File(cacheDir, "updates");
                if (!updateDir.exists()) {
                    updateDir.mkdirs();
                }

                // Clean old APKs from previous updates
                File[] oldFiles = updateDir.listFiles();
                if (oldFiles != null) {
                    for (File oldFile : oldFiles) {
                        try {
                            oldFile.delete();
                        } catch (Exception ignored) {}
                    }
                }

                String cleanVersion = version.replace("/", "_").replace("\\", "_");
                File apkFile = new File(updateDir, "SnapFind-" + cleanVersion + ".apk");

                Log.d(TAG, "Starting APK download from: " + downloadUrl + " to: " + apkFile.getAbsolutePath());

                URL url = new URL(downloadUrl);
                connection = (HttpURLConnection) url.openConnection();
                connection.setConnectTimeout(25000);
                connection.setReadTimeout(45000);
                connection.setInstanceFollowRedirects(true);
                connection.setRequestProperty("User-Agent", "SnapFind-Android-Updater");

                int responseCode = connection.getResponseCode();
                // Follow redirects manually if needed (GitHub asset redirects)
                if (responseCode == HttpURLConnection.HTTP_MOVED_PERM || 
                    responseCode == HttpURLConnection.HTTP_MOVED_TEMP || 
                    responseCode == 307 || responseCode == 308) {
                    String newUrl = connection.getHeaderField("Location");
                    connection.disconnect();

                    if (newUrl != null && newUrl.startsWith("https://")) {
                        URL redirectedUrl = new URL(newUrl);
                        connection = (HttpURLConnection) redirectedUrl.openConnection();
                        connection.setConnectTimeout(25000);
                        connection.setReadTimeout(45000);
                        connection.setRequestProperty("User-Agent", "SnapFind-Android-Updater");
                        responseCode = connection.getResponseCode();
                    }
                }

                if (responseCode != HttpURLConnection.HTTP_OK) {
                    throw new Exception("HTTP download error: " + responseCode + " " + connection.getResponseMessage());
                }

                long fileLength = connection.getContentLengthLong();
                inputStream = connection.getInputStream();
                outputStream = new FileOutputStream(apkFile);

                byte[] buffer = new byte[8192];
                long totalBytes = 0;
                int bytesRead;
                long lastProgressTime = 0;

                while ((bytesRead = inputStream.read(buffer)) != -1) {
                    if (cancelRequested) {
                        outputStream.close();
                        apkFile.delete();
                        isDownloading = false;
                        mainHandler.post(() -> call.reject("Download cancelled by user"));
                        return;
                    }

                    outputStream.write(buffer, 0, bytesRead);
                    totalBytes += bytesRead;

                    long now = System.currentTimeMillis();
                    if (now - lastProgressTime > 150) {
                        lastProgressTime = now;
                        int percent = fileLength > 0 ? (int) ((totalBytes * 100) / fileLength) : -1;

                        JSObject progressObj = new JSObject();
                        progressObj.put("progress", percent);
                        progressObj.put("bytesDownloaded", totalBytes);
                        progressObj.put("totalBytes", fileLength);
                        notifyListeners("downloadProgress", progressObj);
                    }
                }

                outputStream.flush();
                outputStream.close();
                outputStream = null;
                inputStream.close();
                inputStream = null;

                if (!apkFile.exists() || apkFile.length() == 0) {
                    throw new Exception("Downloaded APK is empty or missing");
                }

                // Final progress 100%
                JSObject finalProgress = new JSObject();
                finalProgress.put("progress", 100);
                finalProgress.put("bytesDownloaded", apkFile.length());
                finalProgress.put("totalBytes", apkFile.length());
                notifyListeners("downloadProgress", finalProgress);

                isDownloading = false;

                // Launch package installer
                Uri apkUri = FileProvider.getUriForFile(
                        context,
                        context.getPackageName() + ".fileprovider",
                        apkFile
                );

                Intent installIntent = new Intent(Intent.ACTION_VIEW);
                installIntent.setDataAndType(apkUri, "application/vnd.android.package-archive");
                installIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

                context.startActivity(installIntent);

                JSObject result = new JSObject();
                result.put("success", true);
                result.put("filePath", apkFile.getAbsolutePath());
                result.put("fileSize", apkFile.length());
                mainHandler.post(() -> call.resolve(result));

            } catch (Exception e) {
                Log.e(TAG, "Download and install failed", e);
                isDownloading = false;
                mainHandler.post(() -> call.reject("Update download failed: " + e.getMessage()));
            } finally {
                try {
                    if (outputStream != null) outputStream.close();
                } catch (Exception ignored) {}
                try {
                    if (inputStream != null) inputStream.close();
                } catch (Exception ignored) {}
                if (connection != null) {
                    connection.disconnect();
                }
            }
        }).start();
    }
}
