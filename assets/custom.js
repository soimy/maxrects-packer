// Custom JavaScript for TypeDoc to add favicon
(function() {
    'use strict';
    
    // Add favicon to document head
    function addFavicon() {
        // Add ICO favicon
        var icoFavicon = document.createElement('link');
        icoFavicon.rel = 'icon';
        icoFavicon.type = 'image/x-icon';
        icoFavicon.href = './favicon.ico';
        document.head.appendChild(icoFavicon);
        
        // Add PNG favicon
        var pngFavicon = document.createElement('link');
        pngFavicon.rel = 'icon';
        pngFavicon.type = 'image/png';
        pngFavicon.href = './favicon.png';
        document.head.appendChild(pngFavicon);
        
        // Add Apple touch icon
        var appleTouchIcon = document.createElement('link');
        appleTouchIcon.rel = 'apple-touch-icon';
        appleTouchIcon.href = './favicon.png';
        document.head.appendChild(appleTouchIcon);
    }
    
    // Run when DOM is loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addFavicon);
    } else {
        addFavicon();
    }
})();
