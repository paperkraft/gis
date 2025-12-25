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
            center: fromLonLat([78.5974, 23.9908]),
            zoom: 4.5,
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
        padding: [100, 100, 100, 100], // top, right, bottom, left padding
        duration: 500,
        maxZoom: 18, // Don't zoom in too much
    });
};

export const handlePrint = (map: Map | null) => {
    if (!map) return;

    map.once('rendercomplete', () => {
        const mapCanvas = document.createElement('canvas');
        const size = map.getSize();
        if (!size) return;

        mapCanvas.width = size[0];
        mapCanvas.height = size[1];
        const mapContext = mapCanvas.getContext('2d');
        if (!mapContext) return;

        // Draw background
        mapContext.fillStyle = 'white';
        mapContext.fillRect(0, 0, mapCanvas.width, mapCanvas.height);

        // Composite all OpenLayers canvases
        Array.prototype.forEach.call(
            map.getViewport().querySelectorAll('.ol-layer canvas, canvas.ol-layer'),
            function (canvas: HTMLCanvasElement) {
                if (canvas.width > 0) {
                    const opacity = (canvas.parentNode as HTMLElement).style.opacity || canvas.style.opacity;
                    mapContext.globalAlpha = opacity === '' ? 1 : Number(opacity);

                    const transform = canvas.style.transform;
                    const matrix = transform
                        .match(/^matrix\(([^\(]*)\)$/)?.[1]
                        .split(',')
                        .map(Number);

                    if (matrix) {
                        mapContext.setTransform(matrix[0], matrix[1], matrix[2], matrix[3], matrix[4], matrix[5]);
                        mapContext.drawImage(canvas, 0, 0);
                    }
                }
            }
        );

        // Open print window
        const printWindow = window.open('', 'Print', 'height=600,width=800');
        if (printWindow) {
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Network Map Print</title>
                        <style>
                            body { margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; }
                            img { max-width: 100%; max-height: 100%; object-fit: contain; }
                        </style>
                    </head>
                    <body>
                        <img src="${mapCanvas.toDataURL()}" onload="window.print();window.close()" />
                    </body>
                </html>
            `);
            printWindow.document.close();
        }
    });

    map.renderSync();
};