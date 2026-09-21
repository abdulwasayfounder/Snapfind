package com.snapfind.ai;

import android.Manifest;
import android.content.ContentResolver;
import android.content.ContentUris;
import android.content.Context;
import android.content.Intent;
import android.database.ContentObserver;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.provider.MediaStore;
import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@CapacitorPlugin(
    name = "SnapFindMediaScanner",
    permissions = {
        @Permission(
            alias = "images",
            strings = {
                Manifest.permission.READ_MEDIA_IMAGES
            }
        ),
        @Permission(
            alias = "selected_images",
            strings = {
                "android.permission.READ_MEDIA_VISUAL_USER_SELECTED"
            }
        ),
        @Permission(
            alias = "storage",
            strings = {
                Manifest.permission.READ_EXTERNAL_STORAGE
            }
        ),
        @Permission(
            alias = "notifications",
            strings = {
                "android.permission.POST_NOTIFICATIONS"
            }
        )
    }
)
public class SnapFindMediaScannerPlugin extends Plugin {

    private static final String TAG = "SnapFindMediaScanner";
    private static SnapFindMediaScannerPlugin activeInstance = null;
    private ContentObserver screenshotObserver = null;
    private static final Set<String> processedUris = new HashSet<>();

    @Override
    public void load() {
        super.load();
        activeInstance = this;
    }

    @PluginMethod
    public void checkGalleryPermission(PluginCall call) {
        JSObject ret = new JSObject();
        boolean granted = false;
        String state = "prompt";

        if (Build.VERSION.SDK_INT >= 34) {
            boolean hasFull = getPermissionState("images") == PermissionState.GRANTED;
            boolean hasPartial = getPermissionState("selected_images") == PermissionState.GRANTED;
            if (hasFull) {
                granted = true;
                state = "granted";
            } else if (hasPartial) {
                granted = true;
                state = "partial";
            } else {
                PermissionState s = getPermissionState("images");
                state = (s == PermissionState.DENIED) ? "denied" : "prompt";
            }
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (getPermissionState("images") == PermissionState.GRANTED) {
                granted = true;
                state = "granted";
            } else {
                PermissionState s = getPermissionState("images");
                state = (s == PermissionState.DENIED) ? "denied" : "prompt";
            }
        } else {
            if (getPermissionState("storage") == PermissionState.GRANTED) {
                granted = true;
                state = "granted";
            } else {
                PermissionState s = getPermissionState("storage");
                state = (s == PermissionState.DENIED) ? "denied" : "prompt";
            }
        }

        ret.put("granted", granted);
        ret.put("permissionState", state);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestGalleryPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 34) {
            if (getPermissionState("images") == PermissionState.GRANTED) {
                JSObject ret = new JSObject();
                ret.put("granted", true);
                ret.put("permissionState", "granted");
                call.resolve(ret);
            } else if (getPermissionState("selected_images") == PermissionState.GRANTED) {
                JSObject ret = new JSObject();
                ret.put("granted", true);
                ret.put("permissionState", "partial");
                call.resolve(ret);
            } else {
                requestPermissionForAliases(new String[]{"images", "selected_images"}, call, "permissionCallback");
            }
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (getPermissionState("images") == PermissionState.GRANTED) {
                JSObject ret = new JSObject();
                ret.put("granted", true);
                ret.put("permissionState", "granted");
                call.resolve(ret);
            } else {
                requestPermissionForAlias("images", call, "permissionCallback");
            }
        } else {
            if (getPermissionState("storage") == PermissionState.GRANTED) {
                JSObject ret = new JSObject();
                ret.put("granted", true);
                ret.put("permissionState", "granted");
                call.resolve(ret);
            } else {
                requestPermissionForAlias("storage", call, "permissionCallback");
            }
        }
    }

    @PermissionCallback
    private void permissionCallback(PluginCall call) {
        JSObject ret = new JSObject();
        boolean granted = false;
        String state = "denied";

        if (Build.VERSION.SDK_INT >= 34) {
            if (getPermissionState("images") == PermissionState.GRANTED) {
                granted = true;
                state = "granted";
            } else if (getPermissionState("selected_images") == PermissionState.GRANTED) {
                granted = true;
                state = "partial";
            }
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (getPermissionState("images") == PermissionState.GRANTED) {
                granted = true;
                state = "granted";
            }
        } else {
            if (getPermissionState("storage") == PermissionState.GRANTED) {
                granted = true;
                state = "granted";
            }
        }

        ret.put("granted", granted);
        ret.put("permissionState", state);
        call.resolve(ret);
    }

    @PluginMethod
    public void openAppSettings(PluginCall call) {
        try {
            Intent intent = new Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.fromParts("package", getContext().getPackageName(), null));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "Error opening app settings", e);
            call.reject("Failed to open app settings: " + e.getMessage());
        }
    }

    @PluginMethod
    public void scanExistingScreenshots(PluginCall call) {
        long sinceTimestamp = call.hasOption("sinceTimestamp") ? call.getLong("sinceTimestamp") : 0L;

        getBridge().executeOnMainThread(() -> {
            new Thread(() -> {
                List<JSObject> screenshots = new ArrayList<>();
                ContentResolver resolver = getContext().getContentResolver();

                String[] projection = new String[]{
                    MediaStore.Images.Media._ID,
                    MediaStore.Images.Media.DISPLAY_NAME,
                    MediaStore.Images.Media.DATE_ADDED,
                    MediaStore.Images.Media.WIDTH,
                    MediaStore.Images.Media.HEIGHT,
                    MediaStore.Images.Media.SIZE,
                    Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q ? MediaStore.Images.Media.RELATIVE_PATH : MediaStore.Images.Media.DATA
                };

                StringBuilder selectionBuilder = new StringBuilder();
                selectionBuilder.append("(");
                selectionBuilder.append(MediaStore.Images.Media.DISPLAY_NAME).append(" LIKE ? OR ");
                selectionBuilder.append(MediaStore.Images.Media.DISPLAY_NAME).append(" LIKE ? OR ");
                selectionBuilder.append(MediaStore.Images.Media.DISPLAY_NAME).append(" LIKE ? OR ");
                selectionBuilder.append(MediaStore.Images.Media.DISPLAY_NAME).append(" LIKE ? OR ");
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    selectionBuilder.append(MediaStore.Images.Media.RELATIVE_PATH).append(" LIKE ? OR ");
                    selectionBuilder.append(MediaStore.Images.Media.RELATIVE_PATH).append(" LIKE ?");
                } else {
                    selectionBuilder.append(MediaStore.Images.Media.DATA).append(" LIKE ? OR ");
                    selectionBuilder.append(MediaStore.Images.Media.DATA).append(" LIKE ?");
                }
                selectionBuilder.append(") AND (");
                selectionBuilder.append(MediaStore.Images.Media.MIME_TYPE).append(" LIKE 'image/%'");
                selectionBuilder.append(")");

                List<String> argsList = new ArrayList<>();
                argsList.add("%Screenshot%");
                argsList.add("%screenshot%");
                argsList.add("%Screenshots%");
                argsList.add("%screen_shot%");
                argsList.add("%Screenshots%");
                argsList.add("%DCIM/Screenshots%");

                if (sinceTimestamp > 0) {
                    selectionBuilder.append(" AND ").append(MediaStore.Images.Media.DATE_ADDED).append(" > ?");
                    argsList.add(String.valueOf(sinceTimestamp / 1000));
                }

                String selection = selectionBuilder.toString();
                String[] selectionArgs = argsList.toArray(new String[0]);
                String sortOrder = MediaStore.Images.Media.DATE_ADDED + " DESC";

                long maxDateAdded = sinceTimestamp;

                try (Cursor cursor = resolver.query(
                        MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
                        projection,
                        selection,
                        selectionArgs,
                        sortOrder
                )) {
                    if (cursor != null) {
                        int total = cursor.getCount();
                        int scanned = 0;

                        int idColumn = cursor.getColumnIndexOrThrow(MediaStore.Images.Media._ID);
                        int nameColumn = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DISPLAY_NAME);
                        int dateColumn = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DATE_ADDED);
                        int widthColumn = cursor.getColumnIndex(MediaStore.Images.Media.WIDTH);
                        int heightColumn = cursor.getColumnIndex(MediaStore.Images.Media.HEIGHT);
                        int sizeColumn = cursor.getColumnIndex(MediaStore.Images.Media.SIZE);

                        while (cursor.moveToNext()) {
                            long id = cursor.getLong(idColumn);
                            String name = cursor.getString(nameColumn);
                            long dateAdded = cursor.getLong(dateColumn);
                            if (dateAdded * 1000 > maxDateAdded) {
                                maxDateAdded = dateAdded * 1000;
                            }
                            int width = widthColumn != -1 ? cursor.getInt(widthColumn) : 0;
                            int height = heightColumn != -1 ? cursor.getInt(heightColumn) : 0;
                            long size = sizeColumn != -1 ? cursor.getLong(sizeColumn) : 0;

                            Uri contentUri = ContentUris.withAppendedId(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, id);
                            String uriStr = contentUri.toString();

                            JSObject item = new JSObject();
                            item.put("uri", uriStr);
                            item.put("filename", name);
                            item.put("dateAdded", dateAdded);
                            item.put("width", width);
                            item.put("height", height);
                            item.put("size", size);

                            screenshots.add(item);
                            processedUris.add(uriStr);
                            scanned++;

                            JSObject progress = new JSObject();
                            progress.put("scanned", scanned);
                            progress.put("total", total);
                            progress.put("currentUri", uriStr);
                            progress.put("screenshot", item);
                            notifyListeners("onInitialScanProgress", progress);
                        }
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Error scanning screenshots", e);
                }

                JSArray array = new JSArray();
                for (JSObject obj : screenshots) {
                    array.put(obj);
                }

                JSObject completedPayload = new JSObject();
                completedPayload.put("totalFound", screenshots.size());
                completedPayload.put("screenshots", array);
                notifyListeners("onInitialScanCompleted", completedPayload);

                JSObject res = new JSObject();
                res.put("totalFound", screenshots.size());
                res.put("lastScanTimestamp", maxDateAdded);
                call.resolve(res);
            }).start();
        });
    }

    @PluginMethod
    public void startScreenshotMonitoring(PluginCall call) {
        Context context = getContext();

        // 1. Start ForegroundService for ongoing notification and persistent ContentObserver
        try {
            Intent serviceIntent = new Intent(context, ScreenshotForegroundService.class);
            serviceIntent.setAction(ScreenshotForegroundService.ACTION_START);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to start ScreenshotForegroundService:", e);
        }

        // 2. Schedule WorkManager periodic task with constraints (batteryNotLow = true)
        try {
            ScreenshotWorker.schedulePeriodicWork(context);
        } catch (Exception e) {
            Log.e(TAG, "Failed to schedule WorkManager task:", e);
        }

        // 3. Also register plugin ContentObserver if not active
        if (screenshotObserver == null) {
            Handler handler = new Handler(Looper.getMainLooper());
            screenshotObserver = new ContentObserver(handler) {
                @Override
                public void onChange(boolean selfChange, Uri uri) {
                    super.onChange(selfChange, uri);
                    if (uri != null) {
                        checkAndNotifyNewScreenshot(uri);
                    } else {
                        checkLatestScreenshot();
                    }
                }
            };

            getContext().getContentResolver().registerContentObserver(
                    MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
                    true,
                    screenshotObserver
            );
        }

        JSObject res = new JSObject();
        res.put("active", true);
        call.resolve(res);
    }

    @PluginMethod
    public void stopScreenshotMonitoring(PluginCall call) {
        if (screenshotObserver != null) {
            getContext().getContentResolver().unregisterContentObserver(screenshotObserver);
            screenshotObserver = null;
        }

        Context context = getContext();
        try {
            Intent serviceIntent = new Intent(context, ScreenshotForegroundService.class);
            serviceIntent.setAction(ScreenshotForegroundService.ACTION_STOP);
            context.stopService(serviceIntent);
        } catch (Exception e) {
            Log.e(TAG, "Error stopping ScreenshotForegroundService:", e);
        }

        JSObject res = new JSObject();
        res.put("active", false);
        call.resolve(res);
    }

    @PluginMethod
    public void updateNotificationProgress(PluginCall call) {
        int progress = call.getInt("progressPercentage", -1);
        Context context = getContext();
        try {
            Intent intent = new Intent(context, ScreenshotForegroundService.class);
            intent.setAction(ScreenshotForegroundService.ACTION_UPDATE_PROGRESS);
            intent.putExtra(ScreenshotForegroundService.EXTRA_PROGRESS, progress);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent);
            } else {
                context.startService(intent);
            }
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "Error updating notification progress:", e);
            call.reject("Failed to update notification progress", e);
        }
    }

    public static void handleNativeScreenshotDetected(Context context, Uri uri) {
        if (activeInstance != null) {
            if (uri != null) {
                activeInstance.checkAndNotifyNewScreenshot(uri);
            } else {
                activeInstance.checkLatestScreenshot();
            }
        }
    }

    private void checkAndNotifyNewScreenshot(Uri uri) {
        new Thread(() -> {
            try {
                ContentResolver resolver = getContext().getContentResolver();
                String[] projection = new String[]{
                        MediaStore.Images.Media._ID,
                        MediaStore.Images.Media.DISPLAY_NAME,
                        MediaStore.Images.Media.DATE_ADDED
                };

                try (Cursor cursor = resolver.query(uri, projection, null, null, null)) {
                    if (cursor != null && cursor.moveToFirst()) {
                        long id = cursor.getLong(cursor.getColumnIndexOrThrow(MediaStore.Images.Media._ID));
                        String name = cursor.getString(cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DISPLAY_NAME));
                        long dateAdded = cursor.getLong(cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DATE_ADDED));

                        if (name != null && name.toLowerCase().contains("screenshot")) {
                            Uri contentUri = ContentUris.withAppendedId(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, id);
                            String uriStr = contentUri.toString();

                            if (!processedUris.contains(uriStr)) {
                                processedUris.add(uriStr);

                                JSObject item = new JSObject();
                                item.put("uri", uriStr);
                                item.put("filename", name);
                                item.put("dateAdded", dateAdded);

                                notifyListeners("onScreenshotDetected", item);
                            }
                        }
                    }
                }
            } catch (Exception e) {
                Log.e(TAG, "Error processing newly detected image URI", e);
            }
        }).start();
    }

    private void checkLatestScreenshot() {
        new Thread(() -> {
            try {
                ContentResolver resolver = getContext().getContentResolver();
                String[] projection = new String[]{
                        MediaStore.Images.Media._ID,
                        MediaStore.Images.Media.DISPLAY_NAME,
                        MediaStore.Images.Media.DATE_ADDED
                };

                String selection = MediaStore.Images.Media.DISPLAY_NAME + " LIKE ? OR " + MediaStore.Images.Media.DISPLAY_NAME + " LIKE ?";
                String[] selectionArgs = new String[]{"%Screenshot%", "%screenshot%"};
                String sortOrder = MediaStore.Images.Media.DATE_ADDED + " DESC LIMIT 1";

                try (Cursor cursor = resolver.query(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, projection, selection, selectionArgs, sortOrder)) {
                    if (cursor != null && cursor.moveToFirst()) {
                        long id = cursor.getLong(cursor.getColumnIndexOrThrow(MediaStore.Images.Media._ID));
                        String name = cursor.getString(cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DISPLAY_NAME));
                        long dateAdded = cursor.getLong(cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DATE_ADDED));

                        Uri contentUri = ContentUris.withAppendedId(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, id);
                        String uriStr = contentUri.toString();

                        if (!processedUris.contains(uriStr)) {
                            processedUris.add(uriStr);

                            JSObject item = new JSObject();
                            item.put("uri", uriStr);
                            item.put("filename", name);
                            item.put("dateAdded", dateAdded);

                            notifyListeners("onScreenshotDetected", item);
                        }
                    }
                }
            } catch (Exception e) {
                Log.e(TAG, "Error checking latest screenshot", e);
            }
        }).start();
    }
}
