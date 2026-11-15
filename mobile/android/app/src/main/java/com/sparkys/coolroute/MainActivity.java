package com.sparkys.coolroute;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    // The intro video has to start by itself. Android's web view blocks autoplay,
    // even for muted video, unless this is turned off; otherwise it shows a grey
    // placeholder with a play button.
    getBridge().getWebView().getSettings().setMediaPlaybackRequiresUserGesture(false);
  }
}
