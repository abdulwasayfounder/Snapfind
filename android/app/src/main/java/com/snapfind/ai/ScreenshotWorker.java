package com.snapfind.ai;

import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import java.util.concurrent.TimeUnit;

public class ScreenshotWorker extends Worker {

    private static final String TAG = "ScreenshotWorker";
    public static final String WORK_NAME = "SnapFindBackgroundIndexingWork";

    public ScreenshotWorker(@NonNull Context context, @NonNull WorkerParameters workerParams) {
        super(context, workerParams);
    }

    @NonNull
    @Override
    public Result doWork() {
        Log.d(TAG, "WorkManager background execution running under batteryNotLow constraint.");

        Context context = getApplicationContext();

        // 1. Ensure ForegroundService is running and ContentObserver is active
        try {
            Intent serviceIntent = new Intent(context, ScreenshotForegroundService.class);
            serviceIntent.setAction(ScreenshotForegroundService.ACTION_START);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error starting foreground service from WorkManager worker:", e);
        }

        return Result.success();
    }

    /**
     * Schedules periodic background indexing work with WorkManager constraints:
     * - batteryNotLow = true
     * - networkConnected = NetworkType.CONNECTED
     */
    public static void schedulePeriodicWork(Context context) {
        Constraints constraints = new Constraints.Builder()
                .setRequiresBatteryNotLow(true)
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build();

        PeriodicWorkRequest workRequest = new PeriodicWorkRequest.Builder(
                ScreenshotWorker.class,
                15, TimeUnit.MINUTES
        )
                .setConstraints(constraints)
                .build();

        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                workRequest
        );
        Log.d(TAG, "WorkManager periodic task scheduled with batteryNotLow & networkConnected constraints.");
    }
}
