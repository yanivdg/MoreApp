# PhotoBridge

PhotoBridge is an Android Kotlin/Jetpack Compose starter app for selecting a local device album and uploading its selected photos/videos to a Google Photos album. It supports creating a new destination album and listing destination albums that this app is allowed to manage.

> **Important Google Photos limitation:** Since the March 31, 2025 API changes, the Library API no longer provides general access to a user's existing Google Photos library. This app can list/manage albums created by this app (using the same OAuth client ID) and can create new albums. It cannot browse or add items to albums the user created manually in Google Photos or albums created by another app. The app therefore presents the available app-created albums and a **New** album option. It does not show inaccessible albums as selectable destinations.

## What's included

- Kotlin + Jetpack Compose Android app.
- Local album discovery using Android MediaStore.
- Per-file selection within a local album.
- Google authorization using Google Play services Identity AuthorizationClient.
- Google Photos Library API calls to list app-created albums, create albums, upload bytes, and create media items in the selected album.
- GitHub Actions workflow that builds a debug APK and publishes it as a workflow artifact.

## Requirements

- Android Studio with Android SDK Platform 35.
- JDK 17.
- A Google account.
- A Google Cloud project with the Google Photos Library API enabled.
- An Android OAuth 2.0 client configured for this app's package name and signing certificate SHA-1.

## 1. Configure Google Cloud

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project (or select an existing project).
3. Enable **Google Photos Library API** for that project.
4. Configure the OAuth consent screen / Google Auth Platform. Add your Google account as a test user while the app is in testing mode.
5. Create an OAuth client ID with application type **Android**.
6. Set the package name to `com.example.photobridge`.
7. Add the SHA-1 fingerprint for the signing key used to install the app.

For a local debug build, the default debug keystore is usually:

- Windows: `%USERPROFILE%\.android\debug.keystore`
- macOS/Linux: `~/.android/debug.keystore`

Get its SHA-1 with:

```bash
keytool -list -v -alias androiddebugkey -keystore ~/.android/debug.keystore -storepass android -keypass android
```

On Windows, replace the keystore path with `%USERPROFILE%\.android\debug.keystore` (or its full path). Register the SHA-1 shown as `SHA1` in the Android OAuth client. If you install an APK signed with a different key, register that key's SHA-1 too.

The app requests these scopes:

- `https://www.googleapis.com/auth/photoslibrary.appendonly` — create albums and add media uploaded by this app.
- `https://www.googleapis.com/auth/photoslibrary.readonly.appcreateddata` — list/read app-created albums and their metadata.

Google may display an unverified-app warning during development. For distribution beyond your own test users, complete Google's OAuth verification and comply with the Photos API user data policy. Google Photos APIs do not support service accounts; a real Google user must authorize the app.

Official setup and policy references:

- [Configure your app](https://developers.google.com/photos/overview/configure-your-app)
- [Google Photos API updates and limitations](https://developers.google.com/photos/support/updates)
- [Manage albums](https://developers.google.com/photos/library/guides/manage-albums)
- [Upload media](https://developers.google.com/photos/library/legacy/guides/upload-media)

## 2. Build locally

1. Open the `PhotoBridge` folder in Android Studio.
2. Allow Gradle sync to finish (JDK 17, Android SDK 35).
3. Connect an Android phone or start an emulator with Google Play services.
4. Run the `app` configuration.
5. On first launch, grant access to photos/videos and connect your Google account.

You can also build from a terminal with Gradle 8.9 installed:

```bash
gradle assembleDebug
```

APK output:

```text
app/build/outputs/apk/debug/app-debug.apk
```

## 3. Build APK on GitHub

1. Create an empty GitHub repository named `PhotoBridge`.
2. Upload/push the contents of this folder to the repository's `main` branch.
3. Open the repository's **Actions** tab.
4. Select **Build PhotoBridge APK** and run it, or push a commit to `main` / `master`.
5. Open the completed workflow run.
6. Under **Artifacts**, download `PhotoBridge-debug-apk` and extract `app-debug.apk`.
7. Copy the APK to your phone and install it. Android may ask you to allow installation from that source.

The workflow intentionally builds a **debug APK** so no private signing key is required in GitHub. For a public Play Store release, create a release signing configuration and keep its keystore/passwords in GitHub Actions Secrets; never commit signing credentials.

## Usage

1. Tap **Connect Google Photos** and authorize the requested access.
2. Grant device media permission.
3. Choose a local device album. The app initially selects all items in that album; use **Select none** / **Select all** or individual checkboxes to adjust.
4. Choose one of the app-created Google Photos albums, or tap **+ New** to create one.
5. Tap **Upload**. The app shows per-file progress and reports errors.

## Current MVP limitations

- Uploads run in the foreground. Keep PhotoBridge open and the device awake while uploading; background/resumable WorkManager uploads are not implemented in this first build.
- The app reads local albums via MediaStore. Android's partial-photo permission mode may expose only the media the user selected.
- The current implementation uploads files sequentially for predictability. Very large files can take time and use network data.
- Google Photos API uploads are stored at original quality and count against the user's Google Account storage quota where applicable.
- Google Photos API has file-size/type limits and album limits; consult the current official upload documentation before large transfers.
- Google API quota, OAuth verification, and policy requirements apply.
- A debug APK is intended for personal testing, not Play Store publication.

## Security notes

- OAuth access tokens are kept in app memory only and are not written to disk by this starter project.
- The app does not upload media to a third-party server; the phone sends media directly to Google Photos over HTTPS.
- Do not add a Google client secret to the Android app. Android OAuth clients do not use a client secret in the app.
