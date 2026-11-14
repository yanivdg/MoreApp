package com.example.photobridge.data

import android.content.ContentResolver
import android.net.Uri
import android.util.Log
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody
import okio.BufferedSink
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.util.concurrent.TimeUnit

class GooglePhotosClient(private val resolver: ContentResolver) {
    private val http = OkHttpClient.Builder()
        .callTimeout(10, TimeUnit.MINUTES)
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(5, TimeUnit.MINUTES)
        .writeTimeout(5, TimeUnit.MINUTES)
        .build()

    fun listAlbums(token: String): List<GoogleAlbum> {
        val albums = mutableListOf<GoogleAlbum>()
        var pageToken: String? = null
        do {
            val url = buildString {
                append("https://photoslibrary.googleapis.com/v1/albums?pageSize=50")
                if (pageToken != null) append("&pageToken=$pageToken")
            }
            val json = get(url, token)
            val array = json.optJSONArray("albums") ?: JSONArray()
            for (i in 0 until array.length()) {
                val a = array.getJSONObject(i)
                albums += GoogleAlbum(a.optString("id"), a.optString("title"), a.optString("mediaItemsCount"))
            }
            pageToken = json.optString("nextPageToken").takeIf { it.isNotBlank() }
        } while (pageToken != null)
        return albums
    }

    fun createAlbum(token: String, title: String): GoogleAlbum {
        val body = JSONObject().put("album", JSONObject().put("title", title))
        val json = postJson("https://photoslibrary.googleapis.com/v1/albums", token, body)
        return GoogleAlbum(json.getString("id"), json.optString("title", title), json.optString("mediaItemsCount"))
    }

    fun uploadAlbum(token: String, albumId: String, files: List<LocalPhoto>, onProgress: (Int, Int, String) -> Unit) {
        var completed = 0
        val total = files.size
        // Upload bytes one by one, then create each media item. This avoids parallel batchCreate calls.
        for (file in files) {
            onProgress(completed, total, "Uploading ${file.name}")
            val uploadToken = uploadBytes(token, file)
            val item = JSONObject()
                .put("simpleMediaItem", JSONObject()
                    .put("fileName", file.name)
                    .put("uploadToken", uploadToken))
            val body = JSONObject()
                .put("albumId", albumId)
                .put("newMediaItems", JSONArray().put(item))
            val response = postJson("https://photoslibrary.googleapis.com/v1/mediaItems:batchCreate", token, body)
            val results = response.optJSONArray("newMediaItemResults")
            val status = results?.optJSONObject(0)?.optJSONObject("status")
            if (status != null && status.optInt("code", 0) != 0) {
                throw IOException("Google Photos rejected ${file.name}: ${status.optString("message")}")
            }
            completed++
            onProgress(completed, total, "Uploaded ${file.name}")
        }
    }

    private fun uploadBytes(token: String, file: LocalPhoto): String {
        val body = object : RequestBody() {
            override fun contentType() = "application/octet-stream".toMediaType()
            override fun contentLength() = file.sizeBytes
            override fun writeTo(sink: BufferedSink) {
                val input = resolver.openInputStream(file.uri)
                    ?: throw IOException("Cannot read ${file.name}. The file may have been moved or permission revoked.")
                input.use { stream ->
                    val buffer = ByteArray(64 * 1024)
                    while (true) {
                        val read = stream.read(buffer)
                        if (read < 0) break
                        sink.write(buffer, 0, read)
                    }
                }
            }
        }
        val request = Request.Builder()
            .url("https://photoslibrary.googleapis.com/v1/uploads")
            .header("Authorization", "Bearer $token")
            .header("Content-type", "application/octet-stream")
            .header("X-Goog-Upload-Protocol", "raw")
            .header("X-Goog-Upload-File-Name", file.name)
            .header("X-Goog-Upload-Content-Type", file.mimeType)
            .post(body)
            .build()
        http.newCall(request).execute().use { response ->
            val text = response.body?.string().orEmpty()
            if (!response.isSuccessful) throw IOException("Upload failed (${response.code}): $text")
            if (text.isBlank()) throw IOException("Google Photos returned an empty upload token for ${file.name}")
            return text.trim()
        }
    }

    private fun get(url: String, token: String): JSONObject {
        val request = Request.Builder().url(url).header("Authorization", "Bearer $token").get().build()
        http.newCall(request).execute().use { response ->
            val text = response.body?.string().orEmpty()
            if (!response.isSuccessful) throw IOException("Google Photos API error (${response.code}): $text")
            return JSONObject(text)
        }
    }

    private fun postJson(url: String, token: String, json: JSONObject): JSONObject {
        val request = Request.Builder()
            .url(url)
            .header("Authorization", "Bearer $token")
            .post(json.toString().toRequestBody("application/json; charset=utf-8".toMediaType()))
            .build()
        http.newCall(request).execute().use { response ->
            val text = response.body?.string().orEmpty()
            if (!response.isSuccessful) throw IOException("Google Photos API error (${response.code}): $text")
            return if (text.isBlank()) JSONObject() else JSONObject(text)
        }
    }
}
