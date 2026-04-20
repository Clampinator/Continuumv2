
/**
 * Injects a script tag into the document head and returns a promise for its completion.
 * @param {string} url - The script source.
 * @returns {Promise<Event>}
 */
export function injectScriptTag(url) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.async = true;
        script.defer = true;
        script.onload = resolve;
        script.onerror = () => reject(new Error("Failed to load Google Maps script. Check your internet connection or API key restrictions."));
        document.head.appendChild(script);
    });
}
