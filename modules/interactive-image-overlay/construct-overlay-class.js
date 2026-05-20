/**
 * Creates and returns the KeyframeOverlay class using the globally available Google Maps API.
 * @returns {function|null}
 */
export function constructOverlayClass() {
    // Explicitly use window.google to prevent ReferenceErrors during early evaluation
    const googleRef = window.google;
    if (!googleRef?.maps?.OverlayView) return null;

    return class extends googleRef.maps.OverlayView {
        constructor(bounds, image, map) {
            super();
            this.bounds_ = bounds;
            this.image_ = image;
            this.map_ = map;
            this.div_ = null;
            this.setMap(map);
        }

        onAdd() {
            const div = document.createElement('div');
            div.style.borderStyle = 'none';
            div.style.borderWidth = '0px';
            div.style.position = 'absolute';
            div.style.opacity = '0.7';

            const img = document.createElement('img');
            img.src = this.image_;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.position = 'absolute';
            div.appendChild(img);

            this.div_ = div;
            const panes = this.getPanes();
            panes.overlayLayer.appendChild(div);
        }

        draw() {
            const overlayProjection = this.getProjection();
            if (!overlayProjection) return;
            const sw = overlayProjection.fromLatLngToDivPixel(this.bounds_.getSouthWest());
            const ne = overlayProjection.fromLatLngToDivPixel(this.bounds_.getNorthEast());

            if (this.div_) {
                this.div_.style.left = sw.x + 'px';
                this.div_.style.top = ne.y + 'px';
                this.div_.style.width = (ne.x - sw.x) + 'px';
                this.div_.style.height = (sw.y - ne.y) + 'px';
            }
        }

        onRemove() {
            if (this.div_) {
                this.div_.parentNode.removeChild(this.div_);
                this.div_ = null;
            }
        }
    };
}
