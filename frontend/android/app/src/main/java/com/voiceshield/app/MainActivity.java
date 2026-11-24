package com.voiceshield.app;

import android.content.Context;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ContinuousVibratorPlugin.class);
        super.onCreate(savedInstanceState);
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
