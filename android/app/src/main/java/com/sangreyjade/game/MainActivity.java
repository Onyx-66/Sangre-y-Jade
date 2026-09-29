package com.sangreyjade.game;

import android.app.Activity;
import android.os.Bundle;
import android.os.Build;
import android.annotation.SuppressLint;
import android.window.OnBackInvokedDispatcher;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebChromeClient;
import java.io.ByteArrayInputStream;
import java.util.HashMap;

public class MainActivity extends Activity {
    private WebView web;
    private static final String ORIGIN = "appassets.androidplatform.net";
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        if(Build.VERSION.SDK_INT>=33)getOnBackInvokedDispatcher().registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_DEFAULT,this::handleBack);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
        web=new WebView(this);
        if((getApplicationInfo().flags & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE)!=0)WebView.setWebContentsDebuggingEnabled(true);
        web.setBackgroundColor(0xff251828);
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setDomStorageEnabled(true);
        web.getSettings().setMediaPlaybackRequiresUserGesture(false);
        web.getSettings().setAllowFileAccess(false);
        web.getSettings().setAllowContentAccess(false);
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) { return !ORIGIN.equals(r.getUrl().getHost()); }
            @Override public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) {
                if(!ORIGIN.equals(r.getUrl().getHost())) return missing();
                String path=r.getUrl().getPath();
                if(path==null || path.contains(".."))return missing();
                if(path.equals("/"))path="/index.html";
                try {
                    String mime="application/octet-stream";
                    if(path.endsWith(".html"))mime="text/html";
                    else if(path.endsWith(".js"))mime="application/javascript";
                    else if(path.endsWith(".css"))mime="text/css";
                    else if(path.endsWith(".png"))mime="image/png";
                    else if(path.endsWith(".webp"))mime="image/webp";
                    else if(path.endsWith(".svg"))mime="image/svg+xml";
                    else if(path.endsWith(".wav"))mime="audio/wav";
                    else if(path.endsWith(".ttf"))mime="font/ttf";
                    HashMap<String,String> headers=new HashMap<>();headers.put("Cache-Control","no-cache");
                    return new WebResourceResponse(mime,"UTF-8",200,"OK",headers,getAssets().open("game"+path));
                } catch(Exception e){return missing();}
            }
            @Override public void onPageFinished(WebView v,String url) { v.evaluateJavascript("window.__SANGRE_Y_JADE__?.audio.unlock()",null); }
        });
        setContentView(web);
        web.loadUrl("https://"+ORIGIN+"/index.html");
    }
    private WebResourceResponse missing(){return new WebResourceResponse("text/plain","UTF-8",404,"Not found",null,new ByteArrayInputStream(new byte[0]));}
    private void handleBack(){web.evaluateJavascript("(()=>{const a=window.__SANGRE_Y_JADE__;if(a?.game){a.game.scene.getScene('Ritual').togglePause()}else{a?.cancelPrologue?.();a?.showTitle()}})()",null);}
    // API 26–32 use the legacy callback; API 33+ registers predictive back above.
    @SuppressLint("GestureBackNavigation")
    @Override public void onBackPressed(){handleBack();}
    @Override protected void onPause(){super.onPause();if(web!=null){web.evaluateJavascript("(()=>{const a=window.__SANGRE_Y_JADE__;a?.audio.current?.pause();const s=a?.game?.scene.getScene('Ritual');if(s&&!s.pausedForChoice&&!s.ended)s.togglePause()})()",null);web.onPause();}}
    @Override protected void onResume(){super.onResume();if(web!=null){web.onResume();web.evaluateJavascript("window.__SANGRE_Y_JADE__?.audio.unlock()",null);}}
    @Override protected void onDestroy(){if(web!=null)web.destroy();super.onDestroy();}
}
