package com.example.photobridge

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.IntentSenderRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CloudUpload
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import com.example.photobridge.data.GoogleAlbum
import com.example.photobridge.data.GooglePhotosClient
import com.example.photobridge.data.LocalAlbum
import com.example.photobridge.data.LocalMediaRepository
import com.example.photobridge.data.LocalPhoto
import com.google.android.gms.auth.api.identity.AuthorizationRequest
import com.google.android.gms.auth.api.identity.Identity
import com.google.android.gms.common.api.Scope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainActivity : ComponentActivity() {
    private var accessToken by mutableStateOf<String?>(null)
    private var pendingAuth by mutableStateOf(false)

    private val authLauncher = registerForActivityResult(ActivityResultContracts.StartIntentSenderForResult()) { result ->
        pendingAuth = false
        if (result.resultCode == RESULT_OK && result.data != null) {
            try {
                val authResult = Identity.getAuthorizationClient(this).getAuthorizationResultFromIntent(result.data!!)
                accessToken = authResult.accessToken
            } catch (e: Exception) {
                authError = e.message ?: "Google authorization failed"
            }
        } else {
            authError = "Google authorization was cancelled."
        }
    }
    private var authError by mutableStateOf<String?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = android.graphics.Color.rgb(18, 24, 38)
        setContent { PhotoBridgeScreen() }
    }

    private fun authorize() {
        if (pendingAuth) return
        pendingAuth = true
        val request = AuthorizationRequest.builder()
            .setRequestedScopes(listOf(
                Scope("https://www.googleapis.com/auth/photoslibrary.appendonly"),
                Scope("https://www.googleapis.com/auth/photoslibrary.readonly.appcreateddata")
            ))
            .build()
        Identity.getAuthorizationClient(this).authorize(request)
            .addOnSuccessListener { result ->
                pendingAuth = false
                if (result.hasResolution()) {
                    val pendingIntent = result.pendingIntent
                    if (pendingIntent != null) {
                        authLauncher.launch(IntentSenderRequest.Builder(pendingIntent.intentSender).build())
                    } else authError = "Google did not provide an authorization screen."
                } else {
                    accessToken = result.accessToken
                }
            }
            .addOnFailureListener { error ->
                pendingAuth = false
                authError = error.message ?: "Unable to connect to Google Photos"
            }
    }

    @Composable
    private fun PhotoBridgeScreen() {
        val scope = rememberCoroutineScope()
        val localRepo = remember { LocalMediaRepository(this) }
        val photosClient = remember { GooglePhotosClient(contentResolver) }
        var permissionGranted by remember { mutableStateOf(hasMediaPermission()) }
        var localAlbums by remember { mutableStateOf(emptyList<LocalAlbum>()) }
        var selectedLocalAlbum by remember { mutableStateOf<LocalAlbum?>(null) }
        var localPhotos by remember { mutableStateOf(emptyList<LocalPhoto>()) }
        var selectedUris by remember { mutableStateOf(setOf<String>()) }
        var googleAlbums by remember { mutableStateOf(emptyList<GoogleAlbum>()) }
        var selectedGoogleAlbum by remember { mutableStateOf<GoogleAlbum?>(null) }
        var newAlbumDialog by remember { mutableStateOf(false) }
        var newAlbumName by remember { mutableStateOf("") }
        var loading by remember { mutableStateOf(false) }
        var uploading by remember { mutableStateOf(false) }
        var progress by remember { mutableIntStateOf(0) }
        var total by remember { mutableIntStateOf(0) }
        var status by remember { mutableStateOf("Connect Google Photos to get started.") }
        var error by remember { mutableStateOf<String?>(null) }

        val permissionLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { result ->
            permissionGranted = result.values.any { it }
            if (permissionGranted) {
                localAlbums = localRepo.albums()
                status = "Choose a local album."
            } else error = "PhotoBridge needs media access to read the albums you select."
        }

        LaunchedEffect(accessToken) {
            val token = accessToken
            if (token != null) {
                loading = true
                error = null
                try {
                    googleAlbums = withContext(Dispatchers.IO) { photosClient.listAlbums(token) }
                    status = "Connected. Choose a local album and a destination."
                } catch (e: Exception) { error = e.message }
                loading = false
            }
        }

        MaterialTheme(colorScheme = darkColorScheme(
            primary = androidx.compose.ui.graphics.Color(0xFF8AB4F8),
            secondary = androidx.compose.ui.graphics.Color(0xFF9CC7B8),
            background = androidx.compose.ui.graphics.Color(0xFF121826),
            surface = androidx.compose.ui.graphics.Color(0xFF1D2636)
        )) {
            Scaffold(containerColor = MaterialTheme.colorScheme.background) { padding ->
                Column(Modifier.fillMaxSize().padding(padding).padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text("PhotoBridge", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
                            Text("Local albums → Google Photos", color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Icon(Icons.Default.CloudUpload, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(34.dp))
                    }
                    Card {
                        Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text("1 · Google account", fontWeight = FontWeight.SemiBold)
                            if (accessToken == null) {
                                Button(onClick = { authorize() }, enabled = !pendingAuth) {
                                    if (pendingAuth) CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp) else Text("Connect Google Photos")
                                }
                            } else {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text("Google Photos connected", Modifier.weight(1f), color = MaterialTheme.colorScheme.secondary)
                                    TextButton(onClick = {
                                        accessToken = null; googleAlbums = emptyList(); selectedGoogleAlbum = null
                                        status = "Disconnected."
                                    }) { Text("Disconnect") }
                                }
                            }
                        }
                    }
                    Card {
                        Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text("2 · Local album", fontWeight = FontWeight.SemiBold)
                            if (!permissionGranted) {
                                Button(onClick = { permissionLauncher.launch(mediaPermissions()) }) { Text("Grant device photo access") }
                            } else {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text("${localAlbums.size} albums found", Modifier.weight(1f), color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    IconButton(onClick = { localAlbums = localRepo.albums() }) { Icon(Icons.Default.Refresh, contentDescription = "Refresh") }
                                }
                                if (localAlbums.isEmpty()) Text("No media found. Check device permissions and storage.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                                LazyColumn(Modifier.heightIn(max = 150.dp)) {
                                    items(localAlbums, key = { it.name }) { album ->
                                        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                                            RadioButton(selected = selectedLocalAlbum?.name == album.name, onClick = {
                                                selectedLocalAlbum = album
                                                localPhotos = localRepo.photos(album.name)
                                                selectedUris = localPhotos.map { it.uri.toString() }.toSet()
                                                status = "${localPhotos.size} items selected from ${album.name}."
                                            })
                                            Column(Modifier.weight(1f)) {
                                                Text(album.name)
                                                Text("${album.count} items", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                            }
                                        }
                                    }
                                }
                            }
                            if (localPhotos.isNotEmpty()) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text("${selectedUris.size} of ${localPhotos.size} selected", Modifier.weight(1f), style = MaterialTheme.typography.bodySmall)
                                    TextButton(onClick = { selectedUris = if (selectedUris.size == localPhotos.size) emptySet() else localPhotos.map { it.uri.toString() }.toSet() }) {
                                        Text(if (selectedUris.size == localPhotos.size) "Select none" else "Select all")
                                    }
                                }
                                LazyColumn(Modifier.heightIn(max = 150.dp)) {
                                    items(localPhotos, key = { it.uri.toString() }) { photo ->
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Checkbox(checked = selectedUris.contains(photo.uri.toString()), onCheckedChange = { checked ->
                                                selectedUris = if (checked) selectedUris + photo.uri.toString() else selectedUris - photo.uri.toString()
                                            })
                                            Text(photo.name, Modifier.weight(1f), maxLines = 1)
                                            Text(formatBytes(photo.sizeBytes), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                        }
                                    }
                                }
                            }
                        }
                    }
                    Card {
                        Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text("3 · Destination Google Photos album", fontWeight = FontWeight.SemiBold)
                            if (accessToken == null) Text("Connect your Google account first.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                            else {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text("Albums created by PhotoBridge / this app", Modifier.weight(1f), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    TextButton(onClick = { newAlbumDialog = true }) { Text("+ New") }
                                }
                                if (googleAlbums.isEmpty()) Text("No app-created albums found. Create one to continue.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                                LazyColumn(Modifier.heightIn(max = 130.dp)) {
                                    items(googleAlbums, key = { it.id }) { album ->
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            RadioButton(selected = selectedGoogleAlbum?.id == album.id, onClick = { selectedGoogleAlbum = album })
                                            Column {
                                                Text(album.title)
                                                Text("${album.count} items", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    if (uploading || total > 0) {
                        LinearProgressIndicator(progress = { if (total == 0) 0f else progress.toFloat() / total }, modifier = Modifier.fillMaxWidth())
                        Text("$progress / $total · $status", style = MaterialTheme.typography.bodySmall)
                    } else Text(status, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
                    Spacer(Modifier.weight(1f))
                    Button(
                        modifier = Modifier.fillMaxWidth().height(52.dp),
                        enabled = accessToken != null && selectedGoogleAlbum != null && selectedUris.isNotEmpty() && !uploading && !loading,
                        onClick = {
                            val token = accessToken ?: return@Button
                            val album = selectedGoogleAlbum ?: return@Button
                            val files = localPhotos.filter { selectedUris.contains(it.uri.toString()) }
                            uploading = true; progress = 0; total = files.size; error = null
                            scope.launch {
                                try {
                                    withContext(Dispatchers.IO) {
                                        photosClient.uploadAlbum(token, album.id, files) { done, count, message ->
                                            runOnUiThread { progress = done; total = count; status = message }
                                        }
                                    }
                                    status = "Finished! ${files.size} items uploaded to ${album.title}."
                                    googleAlbums = withContext(Dispatchers.IO) { photosClient.listAlbums(token) }
                                } catch (e: Exception) { error = e.message ?: "Upload failed"; status = "Upload stopped. Successfully uploaded $progress of $total." }
                                uploading = false
                            }
                        }
                    ) {
                        if (uploading) CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp)
                        else Text("Upload ${selectedUris.size} selected items")
                    }
                    Text("PhotoBridge uploads original files. Keep the app open during this first version's upload.", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }

        if (newAlbumDialog) {
            AlertDialog(
                onDismissRequest = { newAlbumDialog = false },
                title = { Text("Create Google Photos album") },
                text = { OutlinedTextField(value = newAlbumName, onValueChange = { newAlbumName = it }, label = { Text("Album name") }, singleLine = true) },
                confirmButton = {
                    TextButton(enabled = newAlbumName.isNotBlank() && !loading, onClick = {
                        val token = accessToken ?: return@TextButton
                        val title = newAlbumName.trim()
                        newAlbumDialog = false; loading = true; error = null
                        scope.launch {
                            try {
                                val album = withContext(Dispatchers.IO) { photosClient.createAlbum(token, title) }
                                googleAlbums = googleAlbums + album
                                selectedGoogleAlbum = album
                                newAlbumName = ""
                                status = "Created album ${album.title}."
                            } catch (e: Exception) { error = e.message }
                            loading = false
                        }
                    }) { Text("Create") }
                },
                dismissButton = { TextButton(onClick = { newAlbumDialog = false }) { Text("Cancel") } }
            )
        }
        authError?.let { message ->
            LaunchedEffect(message) { error = message; authError = null }
        }
    }

    private fun hasMediaPermission(): Boolean {
        val granted = { permission: String -> ContextCompat.checkSelfPermission(this, permission) == PackageManager.PERMISSION_GRANTED }
        return if (Build.VERSION.SDK_INT >= 34) {
            granted(Manifest.permission.READ_MEDIA_IMAGES) ||
                granted(Manifest.permission.READ_MEDIA_VIDEO) ||
                granted("android.permission.READ_MEDIA_VISUAL_USER_SELECTED")
        } else if (Build.VERSION.SDK_INT >= 33) {
            granted(Manifest.permission.READ_MEDIA_IMAGES) || granted(Manifest.permission.READ_MEDIA_VIDEO)
        } else granted(Manifest.permission.READ_EXTERNAL_STORAGE)
    }

    private fun mediaPermissions(): Array<String> = when {
        Build.VERSION.SDK_INT >= 34 -> arrayOf(Manifest.permission.READ_MEDIA_IMAGES, Manifest.permission.READ_MEDIA_VIDEO, "android.permission.READ_MEDIA_VISUAL_USER_SELECTED")
        Build.VERSION.SDK_INT >= 33 -> arrayOf(Manifest.permission.READ_MEDIA_IMAGES, Manifest.permission.READ_MEDIA_VIDEO)
        else -> arrayOf(Manifest.permission.READ_EXTERNAL_STORAGE)
    }

    private fun formatBytes(bytes: Long): String = when {
        bytes >= 1024L * 1024L -> "%.1f MB".format(bytes / (1024.0 * 1024.0))
        bytes >= 1024L -> "%.0f KB".format(bytes / 1024.0)
        else -> "$bytes B"
    }
}
