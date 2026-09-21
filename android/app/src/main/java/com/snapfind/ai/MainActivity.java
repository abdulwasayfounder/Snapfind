package com.snapfind.ai;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SnapFindMediaScannerPlugin.class);
        registerPlugin(SnapFindBillingPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
