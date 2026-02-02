# Changelog

All notable changes to this project will be documented in this file.

## [1.5.0] - 2026-02-01
### Added
- **Android Support (Mobile)**: Native Android application using React Native and Chaquopy.
- **Embedded Python on Mobile**: Python backend runs directly on Android devices.
- **Automated Mobile FFmpeg**: Integration with `ffmpeg-kit-react-native` for seamless architecture-specific binary management.
- **Scoped Storage handling**: Downloads saved directly to the Android public "Downloads" folder.
- **Bilingual Documentation**: README and landing page available in English and Portuguese.

## [1.4.0] - 2026-02-01
### Added
- **Desktop Support (Tauri)**: Native desktop application built with Tauri (Rust) and React.
- **Acrylic Effects**: Glassmorphism and modern UI effects for Windows.
- **Custom Title Bar**: Integrated window controls (minimize, maximize, close) with native feel.
- **Production Installers**: Automated generation of `.exe` and `.msi` installers.
- **Sidecar Architecture**: Backend Python server bundled as a sidecar process.

## [1.3.0] - 2026-01-31
### Added
- **Persistent History**: Integrated SQLite database for tracking download status and history.
- **Smart Retry Pipeline**: Intelligent download strategy that cycles through formats, cookies, and clients (Web, TV, Android, iOS) to bypass "403 Forbidden" errors.
- **Redownload Feature**: Capability to re-enqueue failed or missing files directly from the history UI.
- **Polling Backend**: Switched from WebSockets to a robust polling mechanism for better stability on large queues.

## [1.2.0] - 2026-01-30
### Added
- **UI Refresh**: Modern, responsive design using Tailwind-like CSS variables and glassmorphism.
- **Lyrics Integration**: Automatic fetching and embedding of synchronized lyrics into media files.
- **Advanced Metadata**: Automatic embedding of high-resolution album covers and ID3 tags.

## [1.1.0] - 2026-01-28
### Added
- **Playlist Management**: Support for downloading entire YouTube/YouTube Music playlists.
- **Selection UI**: Modal to pick specific songs from a playlist before starting the download.
- **Audio/Video Toggle**: Support for 4K video downloads in MP4 format.

## [1.0.0] - 2026-01-26
### Added
- **Core Functionality**: Initial web-based YouTube downloader using FastAPI and yt-dlp.
- **Format Support**: MP3 (320kbps) and basic video quality.
- **Simple UI**: Clean search bar and progress indicators.
