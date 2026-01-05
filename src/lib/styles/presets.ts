
import { GradientStop } from '@/store/styleStore';

export interface Preset {
    name: string;
    stops: GradientStop[];
}

export const PRESETS: Preset[] = [
    {
        name: "EPANET Standard",
        stops: [
            { offset: 0, color: '#0000FF' },
            { offset: 25, color: '#00FFFF' },
            { offset: 50, color: '#00FF00' },
            { offset: 75, color: '#FFFF00' },
            { offset: 100, color: '#FF0000' }
        ]
    },
    {
        name: "Blue Scale",
        stops: [
            { offset: 0, color: '#EBF8FF' },
            { offset: 100, color: '#1E3A8A' }
        ]
    },
    {
        name: "Red Scale",
        stops: [
            { offset: 0, color: '#FFF5F5' },
            { offset: 100, color: '#7F1D1D' }
        ]
    },
    {
        name: "Grayscale",
        stops: [
            { offset: 0, color: '#F3F4F6' },
            { offset: 100, color: '#111827' }
        ]
    },
    {
        name: "Viridis",
        stops: [
            { offset: 25, color: '#3b528b' },
            { offset: 50, color: '#21918c' },
            { offset: 75, color: '#5ec962' },
            { offset: 100, color: '#fde725' }
        ]
    },
    {
        name: "Plasma",
        stops: [
            { offset: 25, color: '#7e03a8' },
            { offset: 50, color: '#cc4778' },
            { offset: 75, color: '#f89540' },
            { offset: 100, color: '#f0f921' }
        ]
    }
];

