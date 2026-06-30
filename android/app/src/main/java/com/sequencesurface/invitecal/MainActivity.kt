package com.sequencesurface.invitecal

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.text.InputType
import android.view.Menu
import android.view.MenuItem
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.EditText
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

/**
 * Thin native shell around the local "WhatsApp → Google Calendar" server.
 *
 * Two jobs:
 *   1. LAUNCHER  → show the dashboard (WebView pointed at your server URL).
 *   2. SHARE     → when you Share invite text from WhatsApp (or anywhere), POST it
 *                  to <serverUrl>/api/share, then open the returned calendar link.
 *
 * The server runs on your computer; the phone reaches it over the same Wi-Fi using
 * an address like http://192.168.1.10:3000 (set on first run, editable from the menu).
 */
class MainActivity : AppCompatActivity() {

    private lateinit var web: WebView
    private val prefs by lazy { getSharedPreferences("cfg", Context.MODE_PRIVATE) }

    private fun serverUrl(): String = (prefs.getString("serverUrl", "") ?: "").trim().trimEnd('/')

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        web = findViewById(R.id.web)
        web.settings.javaScriptEnabled = true
        web.settings.domStorageEnabled = true
        web.webViewClient = WebViewClient()

        handleIntent(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleIntent(intent)
    }

    private fun handleIntent(intent: Intent?) {
        if (intent?.action == Intent.ACTION_SEND && intent.type == "text/plain") {
            val shared = intent.getStringExtra(Intent.EXTRA_TEXT).orEmpty()
            if (serverUrl().isBlank()) promptForUrl { postShare(shared) } else postShare(shared)
        } else {
            if (serverUrl().isBlank()) promptForUrl { loadDashboard() } else loadDashboard()
        }
    }

    private fun loadDashboard() {
        val u = serverUrl()
        if (u.isNotBlank()) web.loadUrl(u)
    }

    private fun promptForUrl(onSet: () -> Unit) {
        val input = EditText(this).apply {
            inputType = InputType.TYPE_TEXT_VARIATION_URI
            hint = "http://192.168.1.10:3000"
            setText(serverUrl().ifBlank { "http://" })
        }
        AlertDialog.Builder(this)
            .setTitle("Server address")
            .setMessage("Address where the app is running on your computer (same Wi-Fi).\nExample: http://192.168.1.10:3000")
            .setView(input)
            .setCancelable(false)
            .setPositiveButton("Save") { _, _ ->
                prefs.edit().putString("serverUrl", input.text.toString().trim().trimEnd('/')).apply()
                onSet()
            }
            .setNegativeButton("Cancel") { _, _ -> if (serverUrl().isBlank()) finish() }
            .show()
    }

    private fun postShare(text: String) {
        if (text.isBlank()) {
            Toast.makeText(this, "Nothing to share.", Toast.LENGTH_SHORT).show(); finish(); return
        }
        Toast.makeText(this, "Sending invite…", Toast.LENGTH_SHORT).show()
        thread {
            try {
                val conn = (URL(serverUrl() + "/api/share").openConnection() as HttpURLConnection).apply {
                    requestMethod = "POST"
                    doOutput = true
                    connectTimeout = 8000
                    readTimeout = 15000
                    setRequestProperty("Content-Type", "application/json; charset=utf-8")
                    setRequestProperty("Accept", "application/json")
                }
                OutputStreamWriter(conn.outputStream, Charsets.UTF_8).use {
                    it.write(JSONObject().put("text", text).toString())
                }
                val code = conn.responseCode
                val stream = if (code in 200..299) conn.inputStream else conn.errorStream
                val body = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty()
                runOnUiThread { onShareResult(code, body) }
            } catch (e: Exception) {
                runOnUiThread {
                    Toast.makeText(
                        this,
                        "Couldn't reach the server. Check the address (menu) and that it's running.",
                        Toast.LENGTH_LONG
                    ).show()
                    finish()
                }
            }
        }
    }

    private fun onShareResult(code: Int, body: String) {
        try {
            val j = JSONObject(body)
            if (code in 200..299) {
                val link = j.optString("calendarLink", "")
                val created = j.optBoolean("created", false)
                val detected = j.optBoolean("detected", false)
                val msg = when {
                    created -> "✅ Event created on your calendar!"
                    detected -> "Invite read — opening calendar to add it…"
                    else -> "That didn't look like an invite."
                }
                Toast.makeText(this, msg, Toast.LENGTH_LONG).show()
                if (link.isNotBlank()) startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(link)))
            } else {
                Toast.makeText(this, "Error: " + j.optString("error", "HTTP $code"), Toast.LENGTH_LONG).show()
            }
        } catch (e: Exception) {
            Toast.makeText(this, "Unexpected response from server (HTTP $code).", Toast.LENGTH_LONG).show()
        }
        finish()
    }

    override fun onCreateOptionsMenu(menu: Menu): Boolean {
        menu.add(0, MENU_SET_URL, 0, "Set server URL")
        menu.add(0, MENU_RELOAD, 1, "Reload dashboard")
        return true
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean = when (item.itemId) {
        MENU_SET_URL -> { promptForUrl { loadDashboard() }; true }
        MENU_RELOAD -> { loadDashboard(); true }
        else -> super.onOptionsItemSelected(item)
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (this::web.isInitialized && web.canGoBack()) web.goBack() else super.onBackPressed()
    }

    companion object {
        private const val MENU_SET_URL = 1
        private const val MENU_RELOAD = 2
    }
}
