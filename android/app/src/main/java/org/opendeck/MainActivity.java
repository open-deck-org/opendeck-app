package org.opendeck;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.provider.OpenableColumns;
import android.util.Base64;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Serve decks from their own origin (https://decks.opendeck/<id>/...).
        getBridge().getWebView().setWebViewClient(new DeckWebViewClient(getBridge()));
        handleImportIntent(getIntent());
    }

    @Override
    public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleImportIntent(intent);
    }

    /** A .deck/.zip arriving via VIEW (open) or SEND (share) → import it. */
    private void handleImportIntent(Intent intent) {
        if (intent == null) return;
        final Uri uri;
        if (Intent.ACTION_VIEW.equals(intent.getAction())) {
            uri = intent.getData();
        } else if (Intent.ACTION_SEND.equals(intent.getAction())) {
            uri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
        } else {
            uri = null;
        }
        if (uri == null) return;

        final long id = System.currentTimeMillis();
        new Thread(() -> {
            try {
                byte[] bytes = readAll(getContentResolver().openInputStream(uri));
                String b64 = Base64.encodeToString(bytes, Base64.NO_WRAP);
                String name = displayName(uri).replace("\\", "").replace("'", "");
                String js = "window.__OPENDECK_PENDING={base64:'" + b64 + "',filename:'" + name
                        + "',id:" + id + "};if(window.__opendeckConsumePending)window.__opendeckConsumePending();";
                runOnUiThread(() -> injectWhenReady(js, 24));
            } catch (Exception ignored) {}
        }).start();
    }

    /** Poll cheaply until the shell defines the consumer, then inject once. */
    private void injectWhenReady(String js, int retries) {
        WebView wv = getBridge() != null ? getBridge().getWebView() : null;
        if (wv == null) return;
        wv.evaluateJavascript("typeof window.__opendeckConsumePending", value -> {
            if ("\"function\"".equals(value)) {
                wv.evaluateJavascript(js, null);
            } else if (retries > 0) {
                wv.postDelayed(() -> injectWhenReady(js, retries - 1), 250);
            }
        });
    }

    private static byte[] readAll(InputStream in) throws Exception {
        if (in == null) throw new Exception("no stream");
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buf = new byte[16384];
        int n;
        while ((n = in.read(buf)) != -1) out.write(buf, 0, n);
        in.close();
        return out.toByteArray();
    }

    private String displayName(Uri uri) {
        String name = "shared.deck";
        try {
            android.database.Cursor c = getContentResolver().query(uri, null, null, null, null);
            if (c != null) {
                int i = c.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (i >= 0 && c.moveToFirst()) name = c.getString(i);
                c.close();
            }
        } catch (Exception ignored) {}
        return name;
    }
}
