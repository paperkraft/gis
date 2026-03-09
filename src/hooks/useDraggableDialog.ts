import { useState, useEffect, useCallback } from 'react';

export function useDraggableDialog() {
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        // Only allow left-click drag
        if (e.button !== 0) return;

        // Prevent dragging if the user is clicking a button inside the header (like close)
        if ((e.target as HTMLElement).closest('button')) return;

        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    };

    const onPointerMove = useCallback((e: PointerEvent) => {
        if (isDragging) {
            setPosition({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y
            });
        }
    }, [isDragging, dragStart]);

    const onPointerUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('pointermove', onPointerMove);
            window.addEventListener('pointerup', onPointerUp);
        }
        return () => {
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
        };
    }, [isDragging, onPointerMove, onPointerUp]);

    return { position, onPointerDown, isDragging };
}