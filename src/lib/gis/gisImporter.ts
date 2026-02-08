export async function processGisData(
    file: File,
    settings: { tolerance: number, maxPipeLength: number, defaultDiameter: number, defaultRoughness: number },
    epsg: string = "EPSG:4326",
    onProgress?: (percent: number) => void
): Promise<string> {
    const buffer = await file.arrayBuffer();

    return new Promise((resolve, reject) => {
        const worker = new Worker(new URL('@/lib/workers/gis.worker.ts', import.meta.url));

        worker.postMessage({
            buffer,
            fileName: file.name,
            settings,
            sourceEPSG: epsg
        }, [buffer]);

        worker.onmessage = (e) => {
            const { type, data, error } = e.data;
            if (type === 'progress' && onProgress) onProgress(data);
            else if (type === 'success') {
                resolve(data);
                worker.terminate();
            } else if (type === 'error') {
                reject(new Error(error));
                worker.terminate();
            }
        };

        worker.onerror = (err) => {
            reject(err);
            worker.terminate();
        };
    });
}