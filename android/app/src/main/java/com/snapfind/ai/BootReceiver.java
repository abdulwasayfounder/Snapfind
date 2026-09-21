package com.snapfind.ai;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

public class BootReceiver extends BroadcastReceiver {

    private static final String TAG = "SnapFindBootReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent != null) {
            String action = intent.getAction();
            Log.d(TAG, "BootReceiver received action: " + action);

            if (Intent.ACTION_BOOT_COMPLETED.equals(action) || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {
                Log.d(TAG, "Device rebooted or package replaced. Restarting SnapFind background services...");

                // 1. Re-register ContentObserver and start ForegroundService
                try {
                    Intent serviceIntent = new Intent(context, ScreenshotForegroundService.class);
                    serviceIntent.setAction(ScreenshotForegroundService.ACTION_START);
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        context.startForegroundService(serviceIntent);
                    } else {
                        context.startService(serviceIntent);
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Failed to start ScreenshotForegroundService on boot:", e);
                }

                // 2. Restart WorkManager task with constraints
                try {
                    ScreenshotWorker.schedulePeriodicWork(context);
                } catch (Exception e) {
                    Log.e(TAG, "Failed to schedule WorkManager task on boot:", e);
                }
            }
        }
    }
}
