/**
 * Hook personnalisé pour gérer les zones protégées ("saved space")
 * et éviter les superpositions entre éléments décoratifs.
 * 
 * Ce hook centralise la logique de détection des zones protégées
 * pour les stone patches, fenêtres, portes, meurtrières, quoins, etc.
 */

import { useMemo } from 'react';
import type { ProtectedArea, ProtectedAreasConfig } from '../types';
import { FACE_CORNERS } from '../config/protectedAreasConfig';

export interface ProtectedAreasHookResult {
  /** Vérifie si une position est dans une zone protégée */
  isInProtectedZone: (
    face: string,
    x: number,
    y: number,
    stoneWidth: number,
    stoneHeight: number
  ) => boolean;
  /** Configuration des zones protégées */
  protectedAreas: ProtectedAreasConfig;
}

/**
 * Hook générique pour les zones protégées avec configuration personnalisable.
 * 
 * @param protectedAreas - Configuration des zones à protéger
 * @param getAreaForFace - Fonction optionnelle pour déterminer quelle zone utiliser pour une face donnée
 * @returns Objet avec la fonction isInProtectedZone et la configuration
 */
export function useProtectedAreas(
  protectedAreas: ProtectedAreasConfig,
  getAreaForFace?: (face: string) => ProtectedArea
): ProtectedAreasHookResult {
  
  const isInProtectedZone = useMemo(() => {
    return (
      face: string,
      x: number,
      y: number,
      stoneWidth: number,
      stoneHeight: number
    ): boolean => {
      // Si une fonction personnalisée est fournie, l'utiliser
      if (getAreaForFace) {
        const area = getAreaForFace(face);
        if (area) {
          const closestX = Math.abs(x - (area.centerX ?? 0)) - stoneWidth / 2;
          const closestY = Math.abs(y - (area.centerY ?? 0)) - stoneHeight / 2;
          return closestX < (area.marginX ?? 0) && closestY < area.marginY;
        }
        return false;
      }
      
      // Sinon, vérifier toutes les zones configurées
      for (const [areaKey, area] of Object.entries(protectedAreas)) {
        // Pour les zones de coins (spéciales)
        if (areaKey === 'corner') {
          const cornerMarginX = area.marginX ?? 0;
          const cornerMarginY = area.marginY;
          
          for (const [cornerX, cornerY] of FACE_CORNERS) {
            const distX = Math.abs(x - cornerX) - stoneWidth / 2;
            const distY = Math.abs(y - cornerY) - stoneHeight / 2;
            if (distX < cornerMarginX && distY < cornerMarginY) {
              return true;
            }
          }
        } else {
          // Pour les zones centrales (fenêtres, portes, etc.)
          const closestX = Math.abs(x - (area.centerX ?? 0)) - stoneWidth / 2;
          const closestY = Math.abs(y - (area.centerY ?? 0)) - stoneHeight / 2;
          if (closestX < (area.marginX ?? 0) && closestY < area.marginY) {
            return true;
          }
        }
      }
      
      return false;
    };
  }, [protectedAreas, getAreaForFace]);

  return {
    isInProtectedZone,
    protectedAreas,
  };
}

/**
 * Hook spécialisé pour les murs avec fenêtres/portes/meurtrières.
 * Détermine automatiquement la zone protégée en fonction du type de face.
 */
export function useWindowProtectedAreas(
  protectedAreas: ProtectedAreasConfig,
  doorFace: string | null,
  isIsolated: boolean
): ProtectedAreasHookResult {
  
  const getAreaForFace = useMemo(() => {
    return (face: string): ProtectedArea => {
      if (face === doorFace) {
        return protectedAreas.door;
      } else if (isIsolated) {
        return protectedAreas.arrowSlit;
      } else {
        return protectedAreas.window;
      }
    };
  }, [protectedAreas, doorFace, isIsolated]);

  return useProtectedAreas(protectedAreas, getAreaForFace);
}

/**
 * Hook spécialisé pour les cellules standard (quoins et base trim).
 */
export function useStandardProtectedAreas(
  protectedAreas: ProtectedAreasConfig
): ProtectedAreasHookResult {
  
  const getAreaForFace = useMemo(() => {
    return (face: string): ProtectedArea => {
      // Pour StandardCell, on vérifie à la fois les coins et la base trim
      // Ce hook retourne la première zone qui match (simplification)
      return protectedAreas.corner;
    };
  }, [protectedAreas]);

  return useProtectedAreas(protectedAreas, getAreaForFace);
}
