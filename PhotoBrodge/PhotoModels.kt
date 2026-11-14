package com.example.photobridge.data

import android.net.Uri

data class LocalAlbum(
    val name: String,
    val count: Int,
    val sampleUri: Uri?
)

data class LocalPhoto(
    val uri: Uri,
    val name: String,
    val mimeType: String,
    val sizeBytes: Long
)

data class GoogleAlbum(
    val id: String,
    val title: String,
    val count: String = ""
)
