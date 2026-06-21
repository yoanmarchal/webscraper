/**
 * Configuration centralisée des zones protégées ("saved space")
 * pour éviter les superpositions entre éléments décoratifs.
 * 
 * Ces valeurs définissent les marges de sécurité autour des éléments fonctionnels
 * (fenêtres, portes, meurtrières, quoins, base trim) où les stone patches ne doivent pas être placés.
 */

import type { ProtectedAreasConfig } from '../types';

// Valeur du rayon des coins arrondis (utilisée dans ShapedBox)
export const EDGE_R = 0.18;
export const FLAT_LIMIT = 0.5 - EDGE_R; // 0.32

/**
 * Zones protégées pour WallWithWindowCell
 * Protège les fenêtres, portes et meurtrières contre les superpositions avec les stone patches
 */
export const WINDOW_PROTECTED_AREAS: ProtectedAreasConfig = {
  // Fenêtre : cadre 0.6×0.5, vitre 0.54×0.44
  // Zone à protéger : demi-largeur = 0.3, demi-hauteur = 0.25
  // Marge légèrement supérieure pour sécurité : 0.32 × 0.27
  window: { marginX: 0.32, marginY: 0.27, centerX: 0, centerY: 0 },
  
  // Porte : cadre 0.48×0.8, panneau 0.4×0.7
  // Positionnée en bas (centerY ≈ -0.10)
  // Demi-largeur = 0.24, demi-hauteur = 0.40
  // Marge : 0.26 × 0.42
  door: { marginX: 0.26, marginY: 0.42, centerX: 0, centerY: -0.10 },
  
  // Meurtrière : 0.14×0.4
  // Demi-largeur = 0.07, demi-hauteur = 0.20
  // Marge : 0.09 × 0.23
  arrowSlit: { marginX: 0.09, marginY: 0.23, centerX: 0, centerY: 0 },
};

/**
 * Zones protégées pour StandardCell
 * Protège les quoins (coins) et la base trim contre les superpositions avec les stone patches
 */
export const STANDARD_PROTECTED_AREAS: ProtectedAreasConfig = {
  // Zones des coins : protège une zone carrée autour de chaque coin
  // Les quoins sont à environ (±0.42, ±0.46) avec taille 0.16×0.18
  // Marge de 0.12 permet d'éviter les superpositions
  corner: { marginX: 0.12, marginY: 0.12 },
  
  // Zone de la base trim : bande horizontale en bas à y = -0.46
  // Hauteur de la base trim : 0.08
  // Marge verticale de 0.10 pour éviter les superpositions
  baseTrim: { marginY: 0.10, centerY: -0.46 },
};

/**
 * Coordonnées des 4 coins d'une face (normalisées à -0.5..0.5)
 * Utilisées pour vérifier les superpositions avec les quoins
 */
export const FACE_CORNERS: [number, number][] = [
  [-0.5, 0.5],   // Haut-gauche
  [0.5, 0.5],    // Haut-droite
  [-0.5, -0.5],  // Bas-gauche
  [0.5, -0.5],   // Bas-droite
];
