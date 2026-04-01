import { useEffect, useRef } from 'react';

import { useNetworkStore } from '@/store/networkStore';
import { useUIStore } from '@/store/uiStore';
import { WorkbenchModalType } from '@/components/workbench/modal_registry';

const TYPE_TO_MODAL: Record<string, WorkbenchModalType> = {
    junction: 'JUNCTION_PROP',
    reservoir: 'RESERVOIR_PROP',
    tank: 'TANK_PROP',
    pipe: 'PIPE_PROP',
    pump: 'PUMP_PROP',
    valve: 'VALVE_PROP',
};

const PROTECTED_MODALS: WorkbenchModalType[] = ['VALIDATION', 'AUTO_ELEVATION', 'NUMBERING'];

/**
 * Routes feature selection events to the correct property modal.
 * 
 * - When a feature is selected in `select` mode, opens the matching property panel.
 * - When selection is cleared, closes any open property panel.
 * - Does NOT interfere with protected modals (Validation, Auto-Elevation).
 */
export function useSelectionRouter() {
    const lastSelectedIdRef = useRef<string | null>(null);

    const selectedFeature = useNetworkStore((s) => s.selectedFeature);
    const selectedFeatureIds = useNetworkStore((s) => s.selectedFeatureIds);
    const { activeTool, activeModal, activeRightPanel, setActiveModal } = useUIStore();

    useEffect(() => {
        const currentId = selectedFeature
            // @ts-ignore — selectedFeature may be raw store data or an OL Feature
            ? selectedFeature.id || selectedFeature.getId?.()?.toString() || null
            : null;

        // Don't touch protected modals or if a right panel is open
        if (PROTECTED_MODALS.includes(activeModal as any) || activeRightPanel !== 'NONE') {
            lastSelectedIdRef.current = currentId;
            return;
        }

        // Feature selected - Only show properties if a single feature is selected
        if (currentId && currentId !== lastSelectedIdRef.current && activeTool === 'select' && selectedFeatureIds.length === 1) {
            const type = selectedFeature?.type || (selectedFeature as any)?.get?.('type');
            const modalType = TYPE_TO_MODAL[type] || 'NONE';

            if (modalType !== 'NONE') {
                setActiveModal(modalType);
            }

            lastSelectedIdRef.current = currentId;
        }
        // Feature deselected
        else if (!selectedFeature && lastSelectedIdRef.current !== null) {
            if ((activeModal as string).endsWith('_PROP') || selectedFeatureIds.length > 1) {
                setActiveModal('NONE');
            }
            lastSelectedIdRef.current = null;
        }
    }, [selectedFeature, activeTool, activeModal, setActiveModal]);
}
