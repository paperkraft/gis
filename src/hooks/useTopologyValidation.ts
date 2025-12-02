import { useCallback } from 'react';
import { useMapStore } from '@/store/mapStore';
import { useUIStore } from '@/store/uiStore';
import { useValidationStore } from '@/store/validationStore';
import { TopologyValidator } from '@/lib/topology/topologyValidator';

export function useTopologyValidation() {
    const { vectorSource } = useMapStore();
    const { setValidationModalOpen } = useUIStore();
    const { setValidationResult } = useValidationStore();

    const validate = useCallback(() => {
        if (!vectorSource) return;

        // 1. Run Validation
        const validator = new TopologyValidator(vectorSource);
        const result = validator.validateNetwork();

        // 2. Store Result
        setValidationResult(result);

        // 3. Provide Feedback
        if (result.isValid) {
            // Optional: You could show a small toast here instead of the full modal
            // For now, we open the modal to show the "Success" state clearly
            setValidationModalOpen(true);
        } else {
            setValidationModalOpen(true);
        }

        return result;
    }, [vectorSource, setValidationModalOpen, setValidationResult]);

    return { validate };
}