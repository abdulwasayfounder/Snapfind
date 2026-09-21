package com.snapfind.ai;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.ContentResolver;
import android.content.Context;
import android.content.Intent;
import android.database.ContentObserver;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.provider.MediaStore;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

public class ScreenshotForegroundService extends Service {

    private static final String TAG = "ScreenshotForegroundService";
    public static final String CHANNEL_ID = "snapfind_indexing_channel";
    public static final int NOTIFICATION_ID = 1001;

    public static final String ACTION_START = "com.snapfind.ai.ACTION_START_MONITORING";
    public static final String ACTION_STOP = "com.snapfind.ai.ACTION_STOP_MONITORING";
    public static final String ACTION_UPDATE_PROGRESS = "com.snapfind.ai.ACTION_UPDATE_PROGRESS";
    public static final String EXTRA_PROGRESS = "extra_progress_percentage";

    private ContentObserver screenshotObserver = null;
    private static boolean isRunning = false;

    public static boolean isServiceRunning() {
        return isRunning;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        isRunning = true;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && intent.getAction() != null) {
            String action = intent.getAction();
            if (ACTION_STOP.equals(action)) {
                stopForeground(true);
                stopSelf();
                isRunning = false;
                return START_NOT_STICKY;
            } else if (ACTION_UPDATE_PROGRESS.equals(action)) {
                int progress = intent.getIntExtra(EXTRA_PROGRESS, -1);
                updateNotification(progress);
                return START_STICKY;
            }
        }

        startForegroundServiceWithNotification("SnapFind AI is monitoring screenshots", -1);
        registerContentObserverIfNeeded();
        return START_STICKY;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "SnapFind Screenshot Indexing",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Ongoing notification for SnapFind background screenshot monitoring and indexing");
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private void startForegroundServiceWithNotification(String contentText, int progress) {
        Notification notification = buildNotification(contentText, progress);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
    }

    private void updateNotification(int progress) {
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) {
            String text = (progress >= 0 && progress <= 100) 
                    ? "Indexing screenshots... (" + progress + "%)" 
                    : "SnapFind AI is monitoring screenshots";
            Notification notification = buildNotification(text, progress);
            manager.notify(NOTIFICATION_ID, notification);
        }
    }

    private Notification buildNotification(String text, int progress) {
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("SnapFind AI")
                .setContentText(text)
                .setSmallIcon(android.R.drawable.ic_menu_camera)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_LOW);

        if (progress >= 0 && progress <= 100) {
            builder.setProgress(100, progress, false);
        } else {
            builder.setProgress(0, 0, false);
        }

        return builder.build();
    }

    private void registerContentObserverIfNeeded() {
        if (screenshotObserver != null) return;

        Handler handler = new Handler(Looper.getMainLooper());
        screenshotObserver = new ContentObserver(handler) {
            @Override
            public void onChange(boolean selfChange, Uri uri) {
                super.onChange(selfChange, uri);
                Log.d(TAG, "ContentObserver onChange triggered, URI: " + uri);
                SnapFindMediaScannerPlugin.handleNativeScreenshotDetected(getApplicationContext(), uri);
            }
        };

        try {
            getContentResolver().registerContentObserver(
                    MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
                    true,
                    screenshotObserver
            );
            Log.d(TAG, "ContentObserver registered successfully in ForegroundService.");
        } catch (Exception e) {
            Log.e(TAG, "Failed to register ContentObserver in ForegroundService:", e);
        }
    }

    @Override
    public void onDestroy() {
        if (screenshotObserver != null) {
            try {
                getContentResolver().unregisterContentObserver(screenshotObserver);
            } catch (Exception e) {
                Log.e(TAG, "Error unregistering ContentObserver:", e);
            }
            screenshotObserver = null;
        }
        isRunning = false;
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
