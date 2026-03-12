import { Map } from 'ol';
import { fromLonLat } from 'ol/proj';
import { useNetworkStore } from '@/store/networkStore';

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
        maxZoom: 22, // Don't zoom in too much
    });
};

export const handleResetNorth = (map: Map | null) => {
    if (!map) return;
    map.getView().animate({ rotation: 0, duration: 500 });
};

export const handleRotateLeft = (map: Map | null) => {
    if (!map) return;
    const current = map.getView().getRotation();
    map.getView().animate({ rotation: current - Math.PI / 4, duration: 250 });
};

export const handleRotateRight = (map: Map | null) => {
    if (!map) return;
    const current = map.getView().getRotation();
    map.getView().animate({ rotation: current + Math.PI / 4, duration: 250 });
};

export interface PrintOptions {
    pageSize?: 'A4' | 'A3' | 'Letter' | 'Legal';
    orientation?: 'landscape' | 'portrait';
    showNorthArrow?: boolean;
    showTitle?: boolean;
    showDescription?: boolean;
    customTitle?: string;
    customDescription?: string;
    logoUrl?: string;
    drawnBy?: string;
    checkedBy?: string;
    networkExtent?: number[]; // [minX, minY, maxX, maxY] <-- Add this
}

export const handlePrint = (map: Map | null, options: PrintOptions = {}) => {
    if (!map) return;

    const {
        pageSize = 'A4',
        orientation = 'landscape',
        showNorthArrow = true,
        showTitle = true,
        showDescription = true,
        customTitle,
        customDescription,
        drawnBy = 'SYS',
        checkedBy = '-',
        networkExtent,
        logoUrl
    } = options;

    const isPortrait = orientation === 'portrait';

    // Strict known paper dimensions
    const dimensions: Record<string, [number, number]> = {
        'A4': [210, 297],
        'A3': [297, 420],
        'Letter': [215.9, 279.4],
        'Legal': [215.9, 355.6]
    };

    const getTargetDim = () => {
        const [w, h] = dimensions[pageSize] || dimensions['A4'];
        return isPortrait ? [w, h] : [h, w];
    };

    const targetDim = getTargetDim();

    // --- ABSOLUTE MILLIMETER MATH FOR PERFECT FIT ---
    const frameW = targetDim[0] - 20; // 10mm margin on all sides
    const frameH = targetDim[1] - 20;
    const titleBlockH = 30; // Locked exact height of the title block

    // 1. AUTO-CENTER & FIT THE NETWORK
    const originalSize = map.getSize();

    if (networkExtent && networkExtent.length === 4 && originalSize) {
        const currentExtent = map.getView().calculateExtent(originalSize);
        const [nMinX, nMinY, nMaxX, nMaxY] = networkExtent;
        const [cMinX, cMinY, cMaxX, cMaxY] = currentExtent;

        const isCompletelyOutside = nMaxX < cMinX || nMinX > cMaxX || nMaxY < cMinY || nMinY > cMaxY;

        if (isCompletelyOutside) {
            map.getView().fit(networkExtent, {
                size: originalSize,
                padding: [80, 80, 80, 80],
                duration: 0
            });
        }
    }

    // 2. PERFECT ASPECT-RATIO MATCHING
    const originalResolution = map.getView().getResolution();
    if (!originalSize || !originalResolution) return;

    const maxPixelSize = 2400;
    let renderSize: [number, number];

    // The inner viewport dimensions (accounting for the title block)
    const viewW = frameW;
    const viewH = frameH - titleBlockH;

    const aspectWidth = isPortrait ? viewH : viewW;
    const aspectHeight = isPortrait ? viewW : viewH;

    if (aspectWidth > aspectHeight) {
        renderSize = [maxPixelSize, Math.round(maxPixelSize * (aspectHeight / aspectWidth))];
    } else {
        renderSize = [Math.round(maxPixelSize * (aspectWidth / aspectHeight)), maxPixelSize];
    }

    const scaling = Math.min(renderSize[0] / originalSize[0], renderSize[1] / originalSize[1]);

    // 3. CAPTURE RENDER
    map.once('rendercomplete', () => {
        const mapCanvas = document.createElement('canvas');
        mapCanvas.width = renderSize[0];
        mapCanvas.height = renderSize[1];
        const ctx = mapCanvas.getContext('2d');

        if (!ctx) return;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, mapCanvas.width, mapCanvas.height);

        const viewport = map.getViewport();
        const canvases = viewport.querySelectorAll('.ol-layer canvas, canvas.ol-layer');

        canvases.forEach((canvas: Element) => {
            const cvs = canvas as HTMLCanvasElement;
            if (cvs.width === 0 || cvs.height === 0) return;

            ctx.save();
            const parent = cvs.parentElement;
            const opacity = parent?.style.opacity || cvs.style.opacity;
            ctx.globalAlpha = opacity === '' || opacity === undefined ? 1 : Number(opacity);

            const transform = cvs.style.transform;
            if (transform && transform !== 'none') {
                const match = transform.match(/^matrix\(([^)]*)\)$/);
                if (match) {
                    const m = match[1].split(',').map(Number);
                    ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
                }
            }

            try {
                ctx.drawImage(cvs, 0, 0);
            } catch (e) {
                // skip tainted
            }
            ctx.restore();
        });

        const { settings } = useNetworkStore.getState();
        const projectTitle = customTitle ?? settings.title ?? 'UNTITLED PROJECT';
        const projectDescription = customDescription ?? settings.description ?? 'No description provided.';

        const dateObj = new Date();
        const dateString = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;

        const rotation = map.getView().getRotation();
        const northRotation = rotation + (isPortrait ? Math.PI / 2 : 0);

        const dataUrl = mapCanvas.toDataURL('image/png');

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <title>${projectTitle}</title>
                    <style>
                        @media print {
                            @page { 
                                size: ${pageSize} ${orientation}; 
                                margin: 0; 
                            }
                            html, body { 
                                margin: 0 !important; 
                                padding: 0 !important; 
                                height: 100% !important; 
                                width: 100% !important;
                                background: white !important; 
                                -webkit-print-color-adjust: exact; 
                                print-color-adjust: exact;
                            }
                        }
                        
                        body {
                            margin: 0;
                            padding: 0;
                            font-family: 'Helvetica Neue', Arial, sans-serif; 
                            background: #525659;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            min-height: 100vh;
                            box-sizing: border-box;
                        }
                        
                        .cad-frame {
                            background: white;
                            border: 2px solid #000;
                            display: flex;
                            flex-direction: column;
                            box-sizing: border-box;
                            width: ${frameW}mm;
                            height: ${frameH}mm;
                            overflow: hidden; /* Fixes the right border cut-off */
                        }

                        .map-viewport {
                            width: 100%; /* Fixes the horizontal overflow */
                            flex: 1 1 auto;
                            position: relative;
                            overflow: hidden;
                            background: white;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        }
                        
                        ${isPortrait ? `
                        .map-image {
                            position: absolute;
                            top: 50%;
                            left: 50%;
                            transform: translate(-50%, -50%) rotate(90deg);
                            /* Exact reversed mathematical dimensions - absolutely no gaps */
                            width: calc(${viewH}mm); 
                            height: calc(${viewW}mm);
                            object-fit: cover; 
                            object-position: center;
                            image-rendering: high-quality;
                            image-rendering: -webkit-optimize-contrast;
                        }
                        ` : `
                        .map-image {
                            width: 100%;
                            height: 100%;
                            object-fit: cover; 
                            object-position: center;
                            display: block;
                            image-rendering: high-quality;
                            image-rendering: -webkit-optimize-contrast;
                        }
                        `}
                        
                        .north-arrow-wrapper {
                            position: absolute;
                            top: 20px;
                            right: 20px;
                            width: 50px;
                            height: 50px;
                            background: rgba(255, 255, 255, 0.9);
                            border: 1.5px solid #000;
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            z-index: 100;
                        }
                        
                        .title-block {
                            height: ${titleBlockH}mm;
                            width: 100%;
                            box-sizing: border-box;
                            display: grid;
                            grid-template-columns: ${logoUrl ? '2fr 1.5fr 1.8fr 90px' : '2fr 1.5fr 1.5fr'};
                            border-top: 2px solid #000;
                            background: white;
                            flex-shrink: 0;
                            z-index: 10; 
                        }
                        
                        .tb-section {
                            border-right: 1.5px solid #000;
                            padding: 4px 12px;
                            display: flex;
                            flex-direction: column;
                            justify-content: center;
                            overflow: hidden;
                        }

                        .tb-section:last-child {
                            border-right: none;
                        }
                        
                        .tb-logo-section {
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            padding: 6px;
                            background: #fff;
                        }
                        
                        .logo-img {
                            max-width: 100%;
                            max-height: 100%;
                            object-fit: contain;
                        }

                        .tb-label {
                            font-size: 8px;
                            text-transform: uppercase;
                            color: #64748b;
                            letter-spacing: 0.05em;
                            margin-bottom: 2px;
                            font-weight: 600;
                            display: block;
                        }
                        
                        .tb-value {
                            font-size: 14px;
                            color: #000;
                            font-weight: 700;
                            margin: 0;
                            text-transform: uppercase;
                            white-space: nowrap;
                            overflow: hidden;
                            text-overflow: ellipsis;
                        }

                        .tb-desc {
                            font-size: 10px;
                            color: #333;
                            font-weight: 400;
                            margin-top: 2px;
                            display: -webkit-box;
                            -webkit-line-clamp: 2;
                            -webkit-box-orient: vertical;
                            overflow: hidden;
                        }
                        
                        .branding-title {
                            font-size: 14px;
                            font-weight: 900;
                            color: #000;
                            letter-spacing: 0.05em;
                        }

                        .meta-grid {
                            display: grid;
                            grid-template-columns: 1fr 1fr;
                            grid-template-rows: 1fr 1fr;
                            padding: 0;
                        }
                        .meta-cell {
                            padding: 4px 8px;
                            display: flex;
                            flex-direction: column;
                            justify-content: center;
                        }
                        .meta-value {
                            font-size: 11px;
                        }
                    </style>
                </head>
                <body>
                    <div class="cad-frame">
                        <div class="map-viewport">
                            <img src="${dataUrl}" class="map-image" />
                            
                            ${showNorthArrow ? `
                            <div class="north-arrow-wrapper">
                                <svg style="transform: rotate(${northRotation}rad); width: 35px; height: 35px;" viewBox="0 0 100 100">
                                    <path d="M50 5 L85 90 L50 70 L15 90 Z" fill="#000" />
                                    <text x="50" y="45" font-family="Arial" font-size="22" font-weight="bold" fill="#fff" text-anchor="middle">N</text>
                                </svg>
                            </div>
                            ` : ''}
                        </div>

                        ${showTitle ? `
                        <div class="title-block">
                            <div class="tb-section">
                                <span class="tb-label">Project Title</span>
                                <h1 class="tb-value">${projectTitle}</h1>
                                ${showDescription ? `<div class="tb-desc">${projectDescription}</div>` : ''}
                            </div>
                            
                            <div class="tb-section">
                                <span class="tb-label">Application</span>
                                <div class="branding-title">SIGMA TOOLBOX</div>
                                <div class="tb-desc">Water Network GIS Application</div>
                            </div>

                            <div class="tb-section meta-grid" ${logoUrl ? '' : 'style="border-right: none;"'}>
                                <div class="meta-cell" style="border-right: 1.5px solid #000; border-bottom: 1.5px solid #000;">
                                    <span class="tb-label">Date</span>
                                    <div class="tb-value meta-value">${dateString}</div>
                                </div>
                                <div class="meta-cell" style="border-bottom: 1.5px solid #000;">
                                    <span class="tb-label">Drawn By</span>
                                    <div class="tb-value meta-value">${drawnBy}</div>
                                </div>
                                <div class="meta-cell" style="border-right: 1.5px solid #000;">
                                    <span class="tb-label">Scale</span>
                                    <div class="tb-value meta-value">N.T.S.</div>
                                </div>
                                <div class="meta-cell">
                                    <span class="tb-label">Checked By</span>
                                    <div class="tb-value meta-value">${checkedBy}</div>
                                </div>
                            </div>

                            ${logoUrl ? `
                            <div class="tb-logo-section">
                                <img src="${logoUrl}" class="logo-img" alt="Company Logo" />
                            </div>
                            ` : ''}
                        </div>
                        ` : ''}
                    </div>
                    <script>
                        window.onload = function() {
                            setTimeout(function() {
                                window.print();
                            }, 500); 
                        };
                    </script>
                </body>
                </html>
            `);
            printWindow.document.close();
        } else {
            const link = document.createElement('a');
            link.download = `CAD_Layout_${projectTitle.replace(/\s+/g, '_')}.png`;
            link.href = dataUrl;
            link.click();
        }

        // 4. RESTORE ORIGINAL SCREEN STATE
        map.setSize(originalSize);
        map.getView().setResolution(originalResolution);
    });

    // TRIGGER THE SMART RENDER
    map.setSize(renderSize);
    map.getView().setResolution(originalResolution / scaling);
};