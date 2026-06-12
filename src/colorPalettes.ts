/**
 * Système de palettes de couleurs méditerranéennes inspirées de Townscaper
 */

export interface ColorPalette {
  name: string;
  primary: string; // Couleur principale des murs
  accent: string; // Couleur d'accent
  roof: string; // Couleur du toit
  details: string; // Couleur des détails (fenêtres, portes)
  foundation: string; // Couleur des fondations
}

// Palettes méditerranéennes prédéfinies
export const MEDITERRANEAN_PALETTES: ColorPalette[] = [
  {
    name: 'Sunrise Beige',
    primary: '#f5e6d3',
    accent: '#e8d4b8',
    roof: '#c85a3f',
    details: '#8b6f47',
    foundation: '#d4c4a8',
  },
  {
    name: 'Sunset Pink',
    primary: '#f7d4d4',
    accent: '#f0c0c0',
    roof: '#d45252',
    details: '#a05050',
    foundation: '#e0b8b8',
  },
  {
    name: 'Ocean Blue',
    primary: '#cce4f5',
    accent: '#b8d8f0',
    roof: '#8b5a3f',
    details: '#5a7a8f',
    foundation: '#b0d0e8',
  },
  {
    name: 'Sunflower Yellow',
    primary: '#fef3d4',
    accent: '#f5e8b8',
    roof: '#d4704f',
    details: '#b8935a',
    foundation: '#ede0c0',
  },
  {
    name: 'Mint Green',
    primary: '#d8f0e0',
    accent: '#c0e8d0',
    roof: '#a05a4f',
    details: '#6b9070',
    foundation: '#c0dcc8',
  },
  {
    name: 'Terracotta',
    primary: '#ead4b8',
    accent: '#e0c8a8',
    roof: '#b84731',
    details: '#8f6040',
    foundation: '#d4c0a0',
  },
  {
    name: 'Lavender Dream',
    primary: '#e8dcf0',
    accent: '#d8c8e8',
    roof: '#9f5f7f',
    details: '#7f6090',
    foundation: '#d0c0d8',
  },
];

/**
 * Sélectionne une palette aléatoire
 */
export function getRandomPalette(): ColorPalette {
  return MEDITERRANEAN_PALETTES[Math.floor(Math.random() * MEDITERRANEAN_PALETTES.length)];
}

/**
 * Sélectionne une palette par index (utile pour avoir des bâtiments cohérents)
 */
export function getPaletteByIndex(index: number): ColorPalette {
  return MEDITERRANEAN_PALETTES[index % MEDITERRANEAN_PALETTES.length];
}

/**
 * Ajoute une variation de luminosité à une couleur
 * @param color Couleur hex (#RRGGBB)
 * @param variation Pourcentage de variation (-0.1 à 0.1 recommandé)
 */
export function varyColorBrightness(color: string, variation: number): string {
  // Convertir hex en RGB
  const hex = color.replace('#', '');
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);

  // Appliquer la variation
  r = Math.max(0, Math.min(255, Math.round(r * (1 + variation))));
  g = Math.max(0, Math.min(255, Math.round(g * (1 + variation))));
  b = Math.max(0, Math.min(255, Math.round(b * (1 + variation))));

  // Reconvertir en hex
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Génère une variation aléatoire légère d'une couleur
 * @param color Couleur hex (#RRGGBB)
 * @param maxVariation Variation maximale (0.05 = 5%)
 */
export function randomColorVariation(color: string, maxVariation: number = 0.08): string {
  const variation = (Math.random() - 0.5) * 2 * maxVariation;
  return varyColorBrightness(color, variation);
}

/**
 * Crée un identifiant unique pour un "bâtiment" basé sur une position de base
 * Les blocs adjacents horizontalement auront le même building ID
 */
export function getBuildingId(x: number, z: number, gridWidth: number): number {
  // Simple hash basé sur la position pour des bâtiments cohérents
  return Math.floor(x / 2) + Math.floor(z / 2) * Math.floor(gridWidth / 2);
}
