import React from 'react';

const BackgroundMedia = ({ wallpaper, resolvedWallpaper, blurLevel }) => {
  if (!wallpaper) return null;

  return (
    <div className="fixed inset-0 z-[-2] w-full h-full">
      {wallpaper.match(/\.(mp4|webm|ogg)/i) ? (
        <video src={resolvedWallpaper} autoPlay loop muted className="w-full h-full object-cover" />
      ) : (
        <img src={resolvedWallpaper} alt="wallpaper" className="w-full h-full object-cover" />
      )}
      {/* Dark Overlay with Blur to ensure text readability */}
      <div className={`absolute inset-0 bg-black/30 backdrop-blur-${blurLevel}`}></div>
    </div>
  );
};

export default BackgroundMedia;
