package com.example.photobridge.data

import android.content.ContentResolver
import android.content.ContentUris
import android.content.Context
import android.provider.MediaStore

class LocalMediaRepository(private val context: Context) {
    fun albums(): List<LocalAlbum> {
        val resolver = context.contentResolver
        val collection = MediaStore.Files.getContentUri("external")
        val projection = arrayOf(
            MediaStore.Files.FileColumns._ID,
            MediaStore.Files.FileColumns.BUCKET_DISPLAY_NAME,
            MediaStore.Files.FileColumns.MEDIA_TYPE
        )
        val selection = "(${MediaStore.Files.FileColumns.MEDIA_TYPE}=? OR ${MediaStore.Files.FileColumns.MEDIA_TYPE}=?)"
        val args = arrayOf(
            MediaStore.Files.FileColumns.MEDIA_TYPE_IMAGE.toString(),
            MediaStore.Files.FileColumns.MEDIA_TYPE_VIDEO.toString()
        )
        val groups = linkedMapOf<String, Pair<Int, android.net.Uri?>>()
        resolver.query(collection, projection, selection, args, "${MediaStore.Files.FileColumns.DATE_ADDED} DESC")?.use { cursor ->
            val idCol = cursor.getColumnIndexOrThrow(MediaStore.Files.FileColumns._ID)
            val bucketCol = cursor.getColumnIndexOrThrow(MediaStore.Files.FileColumns.BUCKET_DISPLAY_NAME)
            while (cursor.moveToNext()) {
                val id = cursor.getLong(idCol)
                val name = cursor.getString(bucketCol)?.takeIf { it.isNotBlank() } ?: "Other"
                val existing = groups[name]
                val uri = ContentUris.withAppendedId(collection, id)
                groups[name] = Pair((existing?.first ?: 0) + 1, existing?.second ?: uri)
            }
        }
        return groups.map { LocalAlbum(it.key, it.value.first, it.value.second) }.sortedBy { it.name.lowercase() }
    }

    fun photos(albumName: String): List<LocalPhoto> {
        val resolver = context.contentResolver
        val collection = MediaStore.Files.getContentUri("external")
        val projection = arrayOf(
            MediaStore.Files.FileColumns._ID,
            MediaStore.Files.FileColumns.DISPLAY_NAME,
            MediaStore.Files.FileColumns.MIME_TYPE,
            MediaStore.Files.FileColumns.SIZE,
            MediaStore.Files.FileColumns.BUCKET_DISPLAY_NAME
        )
        val selection = "${MediaStore.Files.FileColumns.BUCKET_DISPLAY_NAME}=? AND (${MediaStore.Files.FileColumns.MEDIA_TYPE}=? OR ${MediaStore.Files.FileColumns.MEDIA_TYPE}=?)"
        val args = arrayOf(
            albumName,
            MediaStore.Files.FileColumns.MEDIA_TYPE_IMAGE.toString(),
            MediaStore.Files.FileColumns.MEDIA_TYPE_VIDEO.toString()
        )
        val result = mutableListOf<LocalPhoto>()
        resolver.query(collection, projection, selection, args, "${MediaStore.Files.FileColumns.DATE_ADDED} DESC")?.use { cursor ->
            val idCol = cursor.getColumnIndexOrThrow(MediaStore.Files.FileColumns._ID)
            val nameCol = cursor.getColumnIndexOrThrow(MediaStore.Files.FileColumns.DISPLAY_NAME)
            val mimeCol = cursor.getColumnIndexOrThrow(MediaStore.Files.FileColumns.MIME_TYPE)
            val sizeCol = cursor.getColumnIndexOrThrow(MediaStore.Files.FileColumns.SIZE)
            while (cursor.moveToNext()) {
                val id = cursor.getLong(idCol)
                val uri = ContentUris.withAppendedId(collection, id)
                result += LocalPhoto(
                    uri = uri,
                    name = cursor.getString(nameCol) ?: "media_$id",
                    mimeType = cursor.getString(mimeCol) ?: resolver.getType(uri) ?: "application/octet-stream",
                    sizeBytes = cursor.getLong(sizeCol)
                )
            }
        }
        return result
    }
}
