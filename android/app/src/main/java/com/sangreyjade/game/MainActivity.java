package com.sangreyjade.game;

import android.app.Activity;
import android.os.Bundle;
import android.os.Build;
import android.content.res.Configuration;
import android.graphics.Color;
import android.graphics.Insets;
import android.annotation.SuppressLint;
import android.window.OnBackInvokedDispatcher;
import android.view.View;
import android.view.ViewGroup;
import android.view.Gravity;
import android.view.WindowManager;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.DisplayCutout;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebChromeClient;
import android.webkit.RenderProcessGoneDetail;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Button;
import android.util.Log;
import java.io.ByteArrayInputStream;
import java.util.HashMap;

public class MainActivity extends Activity {
    private WebView web;
    private int safeLeft,safeTop,safeRight,safeBottom;
    private boolean safeRenderer;
    private static final String ORIGIN = "appassets.androidplatform.net";
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        safeRenderer=getPreferences(MODE_PRIVATE).getBoolean("safe_renderer",false);
        if(Build.VERSION.SDK_INT>=33)getOnBackInvokedDispatcher().registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_DEFAULT,this::handleBack);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        applyImmersiveMode();
        try { web=new WebView(this); }
        catch(RuntimeException error){
            Log.e("SangreStartup","Android could not create the WebView",error);
            showRendererError();
            return;
        }
        if(safeRenderer)web.setLayerType(View.LAYER_TYPE_SOFTWARE,null);
        if((getApplicationInfo().flags & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE)!=0)WebView.setWebContentsDebuggingEnabled(true);
        web.setBackgroundColor(0xff251828);
        web.setFitsSystemWindows(false);
        web.setOnApplyWindowInsetsListener((view,insets)->{
            safeLeft=safeTop=safeRight=safeBottom=0;
            if(Build.VERSION.SDK_INT>=30){
                Insets safe=insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                safeLeft=safe.left;safeTop=safe.top;safeRight=safe.right;safeBottom=safe.bottom;
            }else{
                safeLeft=insets.getSystemWindowInsetLeft();safeTop=insets.getSystemWindowInsetTop();
                safeRight=insets.getSystemWindowInsetRight();safeBottom=insets.getSystemWindowInsetBottom();
                if(Build.VERSION.SDK_INT>=28){
                    DisplayCutout cutout=insets.getDisplayCutout();
                    if(cutout!=null){safeLeft=Math.max(safeLeft,cutout.getSafeInsetLeft());safeTop=Math.max(safeTop,cutout.getSafeInsetTop());safeRight=Math.max(safeRight,cutout.getSafeInsetRight());safeBottom=Math.max(safeBottom,cutout.getSafeInsetBottom());}
                }
            }
            publishSafeInsets();
            if(Build.VERSION.SDK_INT>=30)return WindowInsets.CONSUMED;
            if(Build.VERSION.SDK_INT>=28)return insets.consumeDisplayCutout().consumeSystemWindowInsets();
            return insets.consumeSystemWindowInsets();
        });
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setDomStorageEnabled(true);
        web.getSettings().setMediaPlaybackRequiresUserGesture(false);
        web.getSettings().setAllowFileAccess(false);
        web.getSettings().setAllowContentAccess(false);
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean onRenderProcessGone(WebView failed,RenderProcessGoneDetail detail){
                Log.e("SangreStartup","WebView renderer stopped; crashed="+detail.didCrash()+", safeRenderer="+safeRenderer);
                // Android otherwise terminates the host app for a dead renderer.
                // Remove and destroy that WebView; it must never be used again.
                if(failed.getParent() instanceof ViewGroup)((ViewGroup)failed.getParent()).removeView(failed);
                if(web==failed)web=null;
                failed.destroy();
                if(!safeRenderer){
                    getPreferences(MODE_PRIVATE).edit().putBoolean("safe_renderer",true).apply();
                    getIntent().putExtra("renderer_recovery",true);
                    recreate();
                }else showRendererError();
                return true;
            }
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
            @Override public void onPageFinished(WebView v,String url) { v.evaluateJavascript("window.__SANGRE_Y_JADE__?.audio.unlock()",null);publishSafeInsets();v.requestApplyInsets(); }
        });
        setContentView(web);
        String recovery=getIntent().getBooleanExtra("renderer_recovery",false)?"&nativeRecovery=1":"";
        web.loadUrl("https://"+ORIGIN+"/index.html"+(safeRenderer?"?nativeRenderer=canvas"+recovery:""));
    }
    private void applyImmersiveMode(){
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        getWindow().setStatusBarColor(Color.TRANSPARENT);getWindow().setNavigationBarColor(Color.TRANSPARENT);
        if(Build.VERSION.SDK_INT>=28){
            WindowManager.LayoutParams attributes=getWindow().getAttributes();
            attributes.layoutInDisplayCutoutMode=Build.VERSION.SDK_INT>=30?WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS:WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(attributes);
        }
        if(Build.VERSION.SDK_INT>=29){getWindow().setStatusBarContrastEnforced(false);getWindow().setNavigationBarContrastEnforced(false);}
        if(Build.VERSION.SDK_INT>=30){
            getWindow().setDecorFitsSystemWindows(false);
            WindowInsetsController controller=getWindow().getInsetsController();
            if(controller!=null){controller.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);controller.hide(WindowInsets.Type.systemBars());}
        }
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
        if(web!=null)web.requestApplyInsets();
    }
    private void publishSafeInsets(){
        if(web==null)return;
        // Native insets are physical pixels; the viewport/HUD uses CSS pixels.
        String values="["+safeLeft+","+safeTop+","+safeRight+","+safeBottom+"]";
        web.evaluateJavascript("(()=>{const root=document.documentElement;if(!root)return;const p=window.devicePixelRatio||1;const v="+values+";['left','top','right','bottom'].forEach((s,i)=>root.style.setProperty('--native-safe-'+s,v[i]/p+'px'))})()",null);
    }
    @Override public void onWindowFocusChanged(boolean focused){super.onWindowFocusChanged(focused);if(focused)applyImmersiveMode();}
    @Override public void onConfigurationChanged(Configuration config){super.onConfigurationChanged(config);applyImmersiveMode();}
    private WebResourceResponse missing(){return new WebResourceResponse("text/plain","UTF-8",404,"Not found",null,new ByteArrayInputStream(new byte[0]));}
    private void handleBack(){if(web==null){finish();return;}web.evaluateJavascript("(()=>{const a=window.__SANGRE_Y_JADE__;if(a?.cancelLoading){a.cancelLoading();return}if(a?.game){a.game.scene.getScene('Ritual').togglePause()}else{a?.cancelPrologue?.();a?.showTitle()}})()",null);}
    private void showRendererError(){
        LinearLayout panel=new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);panel.setGravity(Gravity.CENTER);panel.setPadding(32,32,32,32);
        panel.setBackgroundColor(0xff251828);
        TextView message=new TextView(this);message.setText(R.string.renderer_error);message.setTextColor(Color.WHITE);message.setTextSize(18);message.setGravity(Gravity.CENTER);
        panel.addView(message);
        Button retry=new Button(this);retry.setText(R.string.renderer_retry);retry.setOnClickListener(view->recreate());panel.addView(retry);
        setContentView(panel);
    }
    // API 26–32 use the legacy callback; API 33+ registers predictive back above.
    @SuppressLint("GestureBackNavigation")
    @Override public void onBackPressed(){handleBack();}
    @Override protected void onPause(){super.onPause();if(web!=null){web.evaluateJavascript("(()=>{const a=window.__SANGRE_Y_JADE__;a?.audio.current?.pause();const s=a?.game?.scene.getScene('Ritual');if(s&&!s.pausedForChoice&&!s.ended)s.togglePause()})()",null);web.onPause();}}
    @Override protected void onResume(){super.onResume();applyImmersiveMode();if(web!=null){web.onResume();web.evaluateJavascript("window.__SANGRE_Y_JADE__?.audio.unlock()",null);}}
    @Override protected void onDestroy(){if(web!=null)web.destroy();super.onDestroy();}
}
