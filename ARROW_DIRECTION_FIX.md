# Arrow Direction Fix - Water Network GIS

## Problem
Pipe arrows were displaying in incorrect directions - they weren't matching the actual flow direction defined by the pipe's `startNodeId` and `endNodeId` properties.

## Root Cause
The arrow rendering code was only considering the **geometric coordinate order** of the pipe LineString, not the **logical flow direction** defined by the topology (startNode → endNode).

### Example of the Issue:
```
Pipe Properties:
- startNodeId: "node-123" (at coordinates [100, 200])
- endNodeId: "node-456" (at coordinates [300, 400])
- Geometry coordinates: [[300, 400], [100, 200]]  ← coordinates in reverse!

OLD BEHAVIOR: Arrow points from [300,400] → [100,200] ✗ WRONG
NEW BEHAVIOR: Arrow points from [100,200] → [300,400] ✓ CORRECT
```

## Solution

### 1. Updated `pipeArrowStyles.ts`

Added a new helper function `shouldReverseArrowDirection()` that:
- Checks if the pipe has `startNodeId` and `endNodeId` properties
- Uses a `reversed` property to indicate if geometry is in reverse order
- Returns `true` if arrows need to be flipped

### 2. Modified Arrow Creation Functions

Both `createPipeArrowStyle()` and `createSinglePipeArrow()` now:
1. Call `shouldReverseArrowDirection()` to check if reversal is needed
2. Process coordinates in the correct order for arrow direction
3. Calculate rotation based on the **flow direction**, not just coordinate order

## How to Use

### Option 1: Set `reversed` Property When Creating Pipes

When creating a pipe, if the geometry coordinates are in reverse order compared to the flow direction:

```typescript
const pipeFeature = new Feature({
  geometry: new LineString(coordinates),
});

pipeFeature.setProperties({
  id: 'pipe-1',
  type: 'pipe',
  startNodeId: 'node-A',
  endNodeId: 'node-B',
  reversed: true,  // ← ADD THIS if coordinates go from B to A
});
```

### Option 2: Automatically Detect Direction (Recommended)

Update the pipe creation logic to automatically detect if coordinates are reversed:

```typescript
function createPipeWithCorrectDirection(
  startNode: Feature,
  endNode: Feature,
  coordinates: number[][]
) {
  const startCoord = (startNode.getGeometry() as Point).getCoordinates();
  const firstCoord = coordinates[0];
  
  // Check if first coordinate matches start node
  const dx = firstCoord[0] - startCoord[0];
  const dy = firstCoord[1] - startCoord[1];
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  const isReversed = distance > 0.001; // Threshold for coordinate matching
  
  const pipeFeature = new Feature({
    geometry: new LineString(coordinates),
  });
  
  pipeFeature.setProperties({
    id: generatePipeId(),
    type: 'pipe',
    startNodeId: startNode.get('id'),
    endNodeId: endNode.get('id'),
    reversed: isReversed,
  });
  
  return pipeFeature;
}
```

### Option 3: Normalize Coordinates on Creation (Best Practice)

**Recommended**: Always ensure coordinates are stored in the correct order:

```typescript
function createPipeWithNormalizedCoordinates(
  startNode: Feature,
  endNode: Feature,
  coordinates: number[][]
) {
  const startCoord = (startNode.getGeometry() as Point).getCoordinates();
  const firstCoord = coordinates[0];
  
  // Check if coordinates need to be reversed
  const dx = firstCoord[0] - startCoord[0];
  const dy = firstCoord[1] - startCoord[1];
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  const normalizedCoords = distance > 0.001 
    ? [...coordinates].reverse() 
    : coordinates;
  
  const pipeFeature = new Feature({
    geometry: new LineString(normalizedCoords),
  });
  
  pipeFeature.setProperties({
    id: generatePipeId(),
    type: 'pipe',
    startNodeId: startNode.get('id'),
    endNodeId: endNode.get('id'),
    reversed: false, // Always false since we normalized
  });
  
  return pipeFeature;
}
```

## Files Modified

1. **src/lib/styles/pipeArrowStyles.ts**
   - Added `shouldReverseArrowDirection()` helper function
   - Updated `createPipeArrowStyle()` to handle reversed coordinates
   - Updated `createSinglePipeArrow()` to handle reversed coordinates

## Testing Checklist

- [ ] Draw a pipe from Node A to Node B - verify arrow points A → B
- [ ] Draw a pipe from Node B to Node A - verify arrow points B → A
- [ ] Import a network with existing pipes - verify all arrows point correctly
- [ ] Reverse a pipe's flow direction - verify arrow flips
- [ ] Multi-segment pipes - verify arrows on all segments point correctly
- [ ] Edit pipe vertices - verify arrows still point in correct direction

## Next Steps

### 1. Update Pipe Drawing Manager

Find where pipes are created in `pipeDrawingManager.ts` and implement Option 3 (normalize coordinates):

```typescript
// In pipeDrawingManager.ts, when finalizing a pipe:
const shouldNormalize = needsCoordinateNormalization(startNode, coordinates);
if (shouldNormalize) {
  coordinates = [...coordinates].reverse();
}
```

### 2. Add Flow Direction Toggle

Add a UI control to reverse pipe flow direction:

```typescript
function reverseFlowDirection(pipeFeature: Feature) {
  const startNodeId = pipeFeature.get('startNodeId');
  const endNodeId = pipeFeature.get('endNodeId');
  
  // Swap node IDs
  pipeFeature.set('startNodeId', endNodeId);
  pipeFeature.set('endNodeId', startNodeId);
  
  // Toggle reversed flag
  const wasReversed = pipeFeature.get('reversed') || false;
  pipeFeature.set('reversed', !wasReversed);
  
  // Trigger re-render
  pipeFeature.changed();
}
```

### 3. Update Import/Export Logic

When importing from GeoJSON, EPANET INP, or other formats:
- Ensure `startNodeId` and `endNodeId` are properly set
- Normalize coordinates to match flow direction
- Set `reversed: false` for all pipes

### 4. Add to Context Menu

Add "Reverse Flow Direction" option to the pipe context menu in `contextMenuManager.ts`:

```typescript
{
  text: 'Reverse Flow Direction',
  icon: 'refresh-cw',
  callback: () => {
    reverseFlowDirection(feature);
  }
}
```

## Related Files to Update

- `src/lib/topology/pipeDrawingManager.ts` - Normalize coordinates on creation
- `src/lib/topology/contextMenuManager.ts` - Add reverse flow menu item
- `src/lib/parsers/geojsonParser.ts` - Ensure proper import
- `src/lib/parsers/inpParser.ts` - Ensure proper import from EPANET
- `src/components/modals/AttributeTableModal.tsx` - Add flow direction indicator

## Benefits

✅ Accurate flow visualization matching hydraulic model
✅ Consistent with industry tools (EPANET, WaterGEMS, InfoWater)
✅ Easier debugging of network topology
✅ Better simulation result visualization
✅ Supports reversible flows in future

---

**Date Fixed**: November 27, 2025  
**Commit**: Fix arrow direction to respect startNodeId and endNodeId  
**Files Changed**: `src/lib/styles/pipeArrowStyles.ts`
