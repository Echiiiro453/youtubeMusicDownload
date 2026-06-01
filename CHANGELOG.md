# Changelog

All notable changes to this project will be documented in this file.

## [1.7.6] - 2026-05-31
### Added
- **Magic Search Playlists**: Full support for scanning and fetching tracks from Spotify and Apple Music playlists using pseudo-playlist generation.
- **UI Warning**: Added an alert when downloading from Spotify/Apple Music explaining the 50-track limit for anonymous visitors.
- **Cover Image Cropping**: Automatically crop 16:9 thumbnails to 1:1 square ratio to remove white/black padding from album covers.

## [1.7.5] - 2026-05-31
### Added
- **Global Localization (i18n)**: Fully translated UI with dynamic switching between English (US), Spanish (ES), and Portuguese (BR).
- **Language Selector**: New flag-based language selector implemented inside the Settings Modal.
- **Robust Database Syncing**: Downloads not associated with a playlist (singles) are now reliably saved to the local SQLite database to prevent redundant re-downloads.
- **Video ID Reliability**: Refactored the data ingestion pipeline to fetch accurate `video_id` metadata directly from `yt-dlp` instead of request URLs.

## [1.6.0] - 2026-05-28
### Added
- **100% Portable Architecture**: Migrated from Tauri to a single `.exe` executable powered by PyWebView, drastically simplifying distribution.
- **Proxy Survival Mode**: Integrated `proxyscrape` to auto-fetch free proxies, combined with 4 fallback clients (TV, Android, iOS, Web) to bypass YouTube IP blocks. Tested up to 1000+ continuous downloads.
- **Queue Memory**: App now remembers unfinished downloads using `localStorage` and prompts to resume them after a restart.
- **Enhanced Error Reporting**: Removed generic 500 errors. `yt-dlp` native errors (e.g., Age Restriction, Login Required) are now bubbled up to the UI.
- **UI Improvements**: Redesigned the cookies tutorial in the Settings modal to be more visual and intuitive.
- **Smart Build System**: Improved Python build script to generate a single portable executable using PyInstaller's `--onefile`.

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
