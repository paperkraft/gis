import { Map } from 'ol';
import { fromLonLat } from 'ol/proj';
import { useNetworkStore } from '@/store/networkStore';
import { LegendBin } from '@/lib/styles/helper';

export const handleZoomIn = (map: Map | null) => {
    if (!map) return;
    const view = map.getView();
    const zoom = view.getZoom();
    if (zoom !== undefined) {
        view.animate({ zoom: zoom + 0.25, duration: 250 });
    }
};

export const handleZoomOut = (map: Map | null) => {
    if (!map) return;
    const view = map.getView();
    const zoom = view.getZoom();
    if (zoom !== undefined) {
        view.animate({ zoom: zoom - 0.25, duration: 250 });
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
    map.getView().animate({ rotation: current - Math.PI / 36, duration: 250 });
};

export const handleRotateRight = (map: Map | null) => {
    if (!map) return;
    const current = map.getView().getRotation();
    map.getView().animate({ rotation: current + Math.PI / 36, duration: 250 });
};

export interface LegendData {
    title: string;
    unit: string;
    bins: LegendBin[];
    x?: number; // Relative X percentage (0-100)
    y?: number; // Relative Y percentage (0-100)
    framed?: boolean;
}

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
    networkExtent?: number[]; // [minX, minY, maxX, maxY]
    legends?: LegendData[];
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
        logoUrl,
        legends = []
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
                            grid-template-columns: 3.5fr 200px 160px 200px 120px;
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
                            border-right: 1.5px solid #000;
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

                        .meta-value {
                            font-size: 11px;
                        }

                        /* Standard Metadata Cells */
                        .meta-group {
                            display: grid;
                            grid-template-rows: repeat(3, 1fr);
                            border-right: 1.5px solid #000;
                        }
                        .meta-item {
                            display: flex;
                            align-items: center;
                            padding: 0 8px;
                            border-bottom: 1px solid #eee;
                            gap: 6px;
                        }
                        .meta-item:last-child {
                            border-bottom: none;
                        }
                        .meta-label {
                            font-size: 7px;
                            font-weight: 800;
                            color: #64748b;
                            text-transform: uppercase;
                            width: 50px;
                            flex-shrink: 0;
                        }
                        .meta-content {
                            font-size: 10px;
                            font-weight: 700;
                            color: #000;
                            text-transform: uppercase;
                        }

                        .branding-title {
                            font-size: 16px;
                            font-weight: 900;
                            color: #000;
                            letter-spacing: 0.1em;
                            line-height: 1;
                        }
                        .branding-subtitle {
                            font-size: 8px;
                            font-weight: 700;
                            color: #64748b;
                            text-transform: uppercase;
                            letter-spacing: 0.05em;
                            margin-top: 2px;
                        }

                        /* Legend Styles */
                        .print-legend {
                            position: absolute;
                            padding: 6px;
                            min-width: 100px;
                            z-index: 50;
                            font-family: monospace;
                        }
                        .print-legend.framed {
                            background: rgba(255, 255, 255, 0.95);
                            border: 1px solid #000;
                            box-shadow: 2px 2px 5px rgba(0,0,0,0.1);
                        }
                        .legend-title {
                            font-size: 9px;
                            font-weight: bold;
                            text-transform: uppercase;
                            border-bottom: 1px solid #eee;
                            margin-bottom: 4px;
                            padding-bottom: 2px;
                        }
                        .legend-title.framed {
                            border-bottom: 1px solid #000;
                        }
                        .legend-item {
                            display: flex;
                            align-items: center;
                            gap: 6px;
                            margin-bottom: 2px;
                        }
                        .legend-color {
                            width: 12px;
                            height: 12px;
                            border: 0.5px solid rgba(0,0,0,0.2);
                        }
                        .legend-label {
                            font-size: 10px;
                            color: #333;
                        }
                        .legend-unit {
                            font-size: 7px;
                            color: #666;
                            text-align: center;
                            margin-top: 4px;
                            border-top: 0.5px solid #eee;
                            padding-top: 2px;
                        }
                    </style>
                </head>
                <body>
                    <div class="cad-frame">
                        <div class="map-viewport" id="map-viewport">
                            <img src="${dataUrl}" class="map-image" />
                            
                            ${showNorthArrow ? `
                            <div class="north-arrow-wrapper">
                                <svg style="transform: rotate(${northRotation}rad); width: 35px; height: 35px;" viewBox="0 0 100 100">
                                    <path d="M50 5 L85 90 L50 70 L15 90 Z" fill="#000" />
                                    <text x="50" y="45" font-family="Arial" font-size="22" font-weight="bold" fill="#fff" text-anchor="middle">N</text>
                                </svg>
                            </div>
                            ` : ''}

                            ${legends.map(lgd => `
                                <div class="print-legend ${lgd.framed ? 'framed' : ''}" style="left: ${lgd.x ?? 80}%; top: ${lgd.y ?? 70}%;">
                                    <div class="legend-title ${lgd.framed ? 'framed' : ''}">${lgd.title}</div>
                                    ${lgd.bins.map(bin => `
                                        <div class="legend-item">
                                            <div class="legend-color" style="background-color: ${bin.color}"></div>
                                            <div class="legend-label">${bin.label}</div>
                                        </div>
                                    `).join('')}
                                    <div class="legend-unit">VALUES IN ${lgd.unit}</div>
                                </div>
                            `).join('')}
                        </div>

                        ${showTitle ? `
                        <div class="title-block">
                            <!-- Section 1: Project Details -->
                            <div class="tb-section">
                                <span class="tb-label">Project Details</span>
                                <h1 class="tb-value" style="font-size: 16px; margin: 2px 0; color: #000;">${projectTitle}</h1>
                                ${showDescription ? `<div class="tb-desc" style="font-size: 9px; opacity: 0.8;">${projectDescription}</div>` : ''}
                            </div>
                            
                            <!-- Section 2: Merged Branding -->
                            <div class="tb-section" style="align-items: center; justify-content: center; text-align: center; background: #fafafa;">
                                ${logoUrl ? `<img src="${logoUrl}" style="max-height: 28px; margin-bottom: 4px; object-fit: contain;" alt="Logo" />` : ''}
                                <div class="branding-subtitle" style="font-size: 7px; margin-bottom: 1px;">BY</div>
                                <div class="branding-title" style="font-size: 12px; line-height: 1.1;">SIGMA INFRAPLAN</div>
                                <div class="branding-subtitle" style="font-size: 7px;">ENGINEERING PVT. LTD.</div>
                            </div>

                            <!-- Section 3: Control Info -->
                            <div class="meta-group">
                                <div class="meta-item">
                                    <span class="meta-label">Date</span>
                                    <span class="meta-content">${dateString}</span>
                                </div>
                                <div class="meta-item">
                                    <span class="meta-label">Scale</span>
                                    <span class="meta-content">N.T.S.</span>
                                </div>
                                <div class="meta-item">
                                    <span class="meta-label">Revision</span>
                                    <span class="meta-content">001</span>
                                </div>
                            </div>

                            <!-- Section 4: Personnel -->
                            <div class="meta-group">
                                <div class="meta-item">
                                    <span class="meta-label">Drawn</span>
                                    <span class="meta-content">${drawnBy}</span>
                                </div>
                                <div class="meta-item">
                                    <span class="meta-label">Checked</span>
                                    <span class="meta-content">${checkedBy}</span>
                                </div>
                                <div class="meta-item">
                                    <span class="meta-label">Approved</span>
                                    <span class="meta-content">-</span>
                                </div>
                            </div>

                            <!-- Section 5: Client/Seal -->
                            <div class="tb-section" style="border-right: none; align-items: center; justify-content: center; background: #fff;">
                                <span class="tb-label" style="opacity: 0.4;">CLIENT SEAL / LOGO</span>
                            </div>
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