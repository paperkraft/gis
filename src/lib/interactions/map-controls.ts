import { Map } from 'ol';
import { fromLonLat } from 'ol/proj';

export const handleZoomIn = (map: Map | null) => {
    if (!map) return;
    const view = map.getView();
    const zoom = view.getZoom();
    if (zoom !== undefined) {
        view.animate({ zoom: zoom + 1, duration: 250 });
    }
};

export const handleZoomOut = (map: Map | null) => {
    if (!map) return;
    const view = map.getView();
    const zoom = view.getZoom();
    if (zoom !== undefined) {
        view.animate({ zoom: zoom - 1, duration: 250 });
    }
};

export const handleZoomToExtent = (map: Map | null) => {
    if (!map) return;

    // Get all layers
    const layers = map.getLayers().getArray();

    // Find the network vector layer
    const vectorLayer = layers.find(
        (layer) =>
            layer.get("name") === "network" ||
            layer.get("title") === "Network Layer"
    );

    if (!vectorLayer) {
        console.warn("⚠️ No network layer found");
        return;
    }

    // Get the vector source
    const source = (vectorLayer as any).getSource();

    if (!source) {
        console.warn("⚠️ No source found");
        return;
    }

    // Get all features
    const features = source.getFeatures();

    if (features.length === 0) {
        console.warn("⚠️ No features to fit");
        // Fallback to default view
        map.getView().animate({
            center: fromLonLat([74.2381, 16.7012]),
            zoom: 14,
            duration: 500,
        });
        return;
    }

    // Calculate the extent of all features
    let extent: number[] | undefined;

    features.forEach((feature: any) => {
        const geometry = feature.getGeometry();
        if (geometry) {
            const featureExtent = geometry.getExtent();

            if (!extent) {
                extent = [...featureExtent];
            } else {
                // Extend the extent to include this feature
                extent[0] = Math.min(extent[0], featureExtent[0]); // minX
                extent[1] = Math.min(extent[1], featureExtent[1]); // minY
                extent[2] = Math.max(extent[2], featureExtent[2]); // maxX
                extent[3] = Math.max(extent[3], featureExtent[3]); // maxY
            }
        }
    });

    if (!extent) {
        console.warn("⚠️ Could not calculate extent");
        return;
    }

    // Fit the view to the extent with padding
    map.getView().fit(extent, {
        padding: [50, 50, 50, 50], // top, right, bottom, left padding
        duration: 500,
        maxZoom: 18, // Don't zoom in too much
    });
};