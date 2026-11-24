package com.voiceshield.app;

import android.content.ContentValues;
import android.content.Context;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.provider.MediaStore;
import android.widget.Toast;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ContinuousVibratorPlugin.class);
        registerPlugin(AndroidDownloaderPlugin.class);
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().saveState(outState);
        }
    }

    @Override
    public void onRestoreInstanceState(Bundle savedInstanceState) {
        super.onRestoreInstanceState(savedInstanceState);
        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().restoreState(savedInstanceState);
        }
    }
}

@CapacitorPlugin(name = "ContinuousVibrator")
class ContinuousVibratorPlugin extends Plugin {
    private Vibrator vibrator;

    @Override
    public void load() {
        Context context = getContext();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            VibratorManager vibratorManager = (VibratorManager) context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
            if (vibratorManager != null) {
                vibrator = vibratorManager.getDefaultVibrator();
            }
        }
        if (vibrator == null) {
            vibrator = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
        }
    }

    @PluginMethod
    public void startContinuousVibration(PluginCall call) {
        if (vibrator != null && vibrator.hasVibrator()) {
            long[] timings = new long[]{0, 250, 150, 250, 150};
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                VibrationEffect effect = VibrationEffect.createWaveform(timings, 0);
                vibrator.vibrate(effect);
            } else {
                vibrator.vibrate(timings, 0);
            }
        }
        call.resolve();
    }

    @PluginMethod
    public void stopContinuousVibration(PluginCall call) {
        if (vibrator != null) {
            vibrator.cancel();
        }
        call.resolve();
    }
}

@CapacitorPlugin(name = "AndroidDownloader")
class AndroidDownloaderPlugin extends Plugin {
    @PluginMethod
    public void downloadFile(PluginCall call) {
        String fileName = call.getString("fileName");
        String base64Data = call.getString("base64Data");
        String mimeType = call.getString("mimeType", "application/octet-stream");

        if (fileName == null || base64Data == null) {
            call.reject("Both fileName and base64Data are required.");
            return;
        }

        try {
            byte[] bytes = android.util.Base64.decode(base64Data, android.util.Base64.DEFAULT);
            Context context = getContext();

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentValues values = new ContentValues();
                values.put(MediaStore.Downloads.DISPLAY_NAME, fileName);
                values.put(MediaStore.Downloads.MIME_TYPE, mimeType);
                values.put(MediaStore.Downloads.IS_PENDING, 1);
                values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);

                Uri uri = context.getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                if (uri != null) {
                    try (OutputStream os = context.getContentResolver().openOutputStream(uri)) {
                        if (os != null) {
                            os.write(bytes);
                            os.flush();
                        }
                    }
                    values.clear();
                    values.put(MediaStore.Downloads.IS_PENDING, 0);
                    context.getContentResolver().update(uri, values, null, null);
                }
            } else {
                File downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                if (!downloadsDir.exists()) downloadsDir.mkdirs();
                File destFile = new File(downloadsDir, fileName);
                try (FileOutputStream fos = new FileOutputStream(destFile)) {
                    fos.write(bytes);
                    fos.flush();
                }
            }

            new Handler(Looper.getMainLooper()).post(() -> {
                Toast.makeText(context, "Saved to Downloads: " + fileName, Toast.LENGTH_LONG).show();
            });

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("fileName", fileName);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to save file: " + e.getMessage());
        }
    }
}
