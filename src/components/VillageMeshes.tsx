/**
 * Rend le village entier en quelques meshes fusionnés (un par groupe de
 * matériau), avec couleurs par vertex. Reconstruit uniquement quand `cells`
 * change (add/remove de bloc), jamais par frame.
 */

import { useEffect, useMemo } from 'react';
import type { GridCell } from '../types';
import { buildVillage } from '../render/buildVillage';

interface VillageMeshesProps {
  cells: GridCell[];
  toWorldPosition: (x: number, y: number, z: number) => [number, number, number];
}

export function VillageMeshes({ cells, toWorldPosition }: VillageMeshesProps) {
  const groups = useMemo(() => buildVillage(cells, toWorldPosition), [cells, toWorldPosition]);

  // Libère les géométries fusionnées quand elles sont remplacées
  useEffect(() => {
    return () => {
      for (const g of groups) g.geometry.dispose();
    };
  }, [groups]);

  return (
    <>
      {groups.map(({ key, mat, geometry }) => (
        <mesh key={key} name={`village-${key}`} geometry={geometry} castShadow receiveShadow>
          <meshStandardMaterial
            vertexColors
            roughness={mat.roughness}
            metalness={mat.metalness ?? 0}
            transparent={mat.transparent ?? false}
            opacity={mat.opacity ?? 1}
            depthWrite={!mat.transparent}
          />
        </mesh>
      ))}
    </>
  );
}
