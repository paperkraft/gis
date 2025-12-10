export const flowUnitOptions = [
    { value: "LPS", label: "LPS (Liters/sec)" },
    { value: "LPM", label: "LPM (Liters/min)" },
    { value: "GPM", label: "GPM (Gallons/min)" },
    { value: "MLD", label: "MLD (Million liters/day)" },
    { value: "MGD", label: "MGD (Million gallons/day)" },
    { value: "CFS", label: "CFS (Cubic feet/sec)" },
    { value: "CMH", label: "CMH (Cubic meters/hr)" },
    { value: "CMD", label: "CMD (Cubic meters/day)" },
];

export const headLossUnitOptions = [
    { value: "H-W", label: "Hazen-Williams" },
    { value: "D-W", label: "Darcy-Weisbach" },
    { value: "C-M", label: "Chezy-Manning" },
]

export const projectionList = [
    { value: "EPSG:3857", label: "Web Mercator" },
    { value: "EPSG:4326", label: "WGS 84" },
    { value: "EPSG:32632", label: "UTM zone 32N" },
    { value: "EPSG:32633", label: "UTM zone 33N" },
    { value: "EPSG:32634", label: "UTM zone 34N" },
    { value: "EPSG:27700", label: "British National Grid" },
    { value: "Simple", label: "Simple X/Y (No Projection)" },
];