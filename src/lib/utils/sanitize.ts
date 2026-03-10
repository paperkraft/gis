import { Feature } from 'ol';

/**
 * Sanitizes a plain-object property map to strip OpenLayers class instances
 * that would crash React if stored in component state.
 */
export const sanitizeProperties = (props: Record<string, any>): Record<string, any> => {
    if (!props) return {};
    const clean: Record<string, any> = {};
    Object.keys(props).forEach(key => {
        const val = props[key];
        if (key === 'geometry') return;
        if (val instanceof Feature || (val && typeof val.getId === 'function')) {
            clean[key] = val.getId()?.toString() || '[Feature]';
        } else if (val && typeof val === 'object' && !Array.isArray(val)) {
            clean[key] = val.id || val.Id || val.ID || '[Object]';
        } else {
            clean[key] = val;
        }
    });
    return clean;
};
