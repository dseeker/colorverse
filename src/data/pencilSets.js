/**
 * Catalog of colored pencil sets for palette color matching.
 * Hex values sourced from publicly-available color-reference charts.
 * Pencil names are brand-specific and remain in English (do not translate).
 */

export const pencilSets = [
  {
    id: "prismacolor-premier",
    brand: "Prismacolor",
    name: "Premier Soft Core",
    colors: [
      { number: "PC101", name: "Black", hex: "#181818" },
      { number: "PC102", name: "White", hex: "#FFFFFE" },
      { number: "PC207", name: "Orange", hex: "#F56432" },
      { number: "PC209", name: "Bright Orange", hex: "#FF5A10" },
      { number: "PC213", name: "Vivid Orange", hex: "#FF6700" },
      { number: "PC216", name: "Burnt Orange", hex: "#CC5500" },
      { number: "PC227", name: "Dark Orange", hex: "#D55800" },
      { number: "PC231", name: "Poppy Red", hex: "#E44D24" },
      { number: "PC901", name: "Scarlet Red", hex: "#E3181F" },
      { number: "PC927", name: "Cinnamon Red", hex: "#DB4C48" },
      { number: "PC939", name: "Coral Red", hex: "#F44336" },
      { number: "PC1002", name: "Red", hex: "#E53935" },
      { number: "PC1006", name: "Bright Red", hex: "#F50057" },
      { number: "PC1008", name: "Burgundy", hex: "#800020" },
      { number: "PC1009", name: "Wine Red", hex: "#722F37" },
      { number: "PC1011", name: "Dark Red", hex: "#8B0000" },
      { number: "PC1013", name: "Maroon", hex: "#800000" },
      { number: "PC1017", name: "Rose Red", hex: "#F73969" },
      { number: "PC1019", name: "Pink", hex: "#FFC0CB" },
      { number: "PC1023", name: "Light Pink", hex: "#FFB6C1" },
      { number: "PC1025", name: "Pale Pink", hex: "#FFE4E1" },
      { number: "PC1035", name: "Vivid Tangerine", hex: "#FF9966" },
      { number: "PC1037", name: "Apricot", hex: "#FBCEB1" },
      { number: "PC1039", name: "Buff", hex: "#F0DC82" },
    ],
  },
  {
    id: "polychromos",
    brand: "Faber-Castell",
    name: "Polychromos",
    colors: [
      { number: "101", name: "Black", hex: "#0D0D0D" },
      { number: "102", name: "Vantablack", hex: "#050505" },
      { number: "106", name: "Warm Gray Dark", hex: "#4A403A" },
      { number: "111", name: "Cadmium Yellow", hex: "#FFD900" },
      { number: "115", name: "Yellow", hex: "#FFDF00" },
      { number: "121", name: "Lemon Yellow", hex: "#FFF44F" },
      { number: "131", name: "Golden Yellow", hex: "#FFCF00" },
      { number: "136", name: "Orange", hex: "#FF6600" },
      { number: "162", name: "Bright Orange", hex: "#FF8040" },
      { number: "187", name: "Vivid Orange", hex: "#FF4500" },
      { number: "189", name: "Red Orange", hex: "#FF5E0A" },
      { number: "192", name: "Red", hex: "#E62E00" },
      { number: "199", name: "Bright Red", hex: "#FF0000" },
      { number: "201", name: "Rose", hex: "#F73969" },
      { number: "205", name: "Violet Red", hex: "#E0115F" },
      { number: "209", name: "Maroon", hex: "#800000" },
      { number: "218", name: "Navy Blue", hex: "#000080" },
      { number: "223", name: "Cobalt Blue", hex: "#0047AB" },
      { number: "225", name: "Sky Blue", hex: "#87CEEB" },
      { number: "230", name: "Turquoise Blue", hex: "#40E0D0" },
      { number: "233", name: "Emerald Green", hex: "#50C878" },
      { number: "263", name: "Dark Green", hex: "#013220" },
      { number: "270", name: "Apple Green", hex: "#8DB600" },
      { number: "278", name: "Sage Green", hex: "#BCB88A" },
    ],
  },
  {
    id: "crayola",
    brand: "Crayola",
    name: "Colored Pencils",
    colors: [
      { number: "R01", name: "Red", hex: "#EE204D" },
      { number: "R02", name: "Orange", hex: "#F8845F" },
      { number: "R03", name: "Yellow", hex: "#FFED00" },
      { number: "R04", name: "Green", hex: "#009170" },
      { number: "R05", name: "Blue", hex: "#0F4DC2" },
      { number: "R06", name: "Violet", hex: "#735EA9" },
      { number: "R07", name: "Black", hex: "#020E19" },
      { number: "R08", name: "White", hex: "#F8F9FA" },
      { number: "R09", name: "Brown", hex: "#965A33" },
      { number: "R10", name: "Gray", hex: "#929591" },
      { number: "R11", name: "Goldenrod", hex: "#DAA520" },
      { number: "R12", name: "Blue-Gray", hex: "#6C9EB1" },
      { number: "R13", name: "Blue-Green", hex: "#00A693" },
      { number: "R14", name: "Yellow-Green", hex: "#9ACD32" },
      { number: "R15", name: "Red-Orange", hex: "#FF5349" },
      { number: "R16", name: "Yellow-Orange", hex: "#FF7D07" },
      { number: "R17", name: "Red-Violet", hex: "#C14A8B" },
      { number: "R18", name: "Purple", hex: "#6F2DA8" },
      { number: "R19", name: "Pink", hex: "#E33591" },
      { number: "R20", name: "Lavender", hex: "#E6E6FA" },
      { number: "R21", name: "Tan", hex: "#D2B48C" },
      { number: "R22", name: "Silver", hex: "#C0C0C0" },
      { number: "R23", name: "Mustard", hex: "#FFDB58" },
      { number: "R24", name: "Burgundy", hex: "#800020" },
    ],
  },
  {
    id: "marco-reno",
    brand: "Marco",
    name: "Reno Professional",
    colors: [
      { number: "R001", name: "Black", hex: "#0F0F0F" },
      { number: "R002", name: "White", hex: "#FFFFFE" },
      { number: "R003", name: "Vermilion", hex: "#E34234" },
      { number: "R004", name: "Orange", hex: "#FF6723" },
      { number: "R005", name: "Yellow", hex: "#FFD700" },
      { number: "R006", name: "Lemon Yellow", hex: "#FFF44F" },
      { number: "R007", name: "Green", hex: "#009B4D" },
      { number: "R008", name: "Forest Green", hex: "#228B22" },
      { number: "R009", name: "Blue", hex: "#1F51A0" },
      { number: "R010", name: "Royal Blue", hex: "#4169E1" },
      { number: "R011", name: "Navy Blue", hex: "#000080" },
      { number: "R012", name: "Violet", hex: "#8F00FF" },
      { number: "R013", name: "Purple", hex: "#603879" },
      { number: "R014", name: "Dark Brown", hex: "#5C4033" },
      { number: "R015", name: "Light Brown", hex: "#967117" },
      { number: "R016", name: "Burnt Sienna", hex: "#A0522D" },
      { number: "R017", name: "Pink", hex: "#F7A5A5" },
      { number: "R018", name: "Coral", hex: "#F07D77" },
      { number: "R019", name: "Lavender", hex: "#B57EDC" },
      { number: "R020", name: "Sky Blue", hex: "#7EC8E3" },
      { number: "R021", name: "Turquoise", hex: "#30D5C8" },
      { number: "R022", name: "Olive Green", hex: "#808000" },
      { number: "R023", name: "Gold", hex: "#D4AF37" },
      { number: "R024", name: "Charcoal", hex: "#36454F" },
    ],
  },
];

/**
 * Returns a flat array of all pencils across all sets.
 * @returns {Array<{number: string, name: string, hex: string, brand: string, setId: string}>}
 */
export function getAllPencils() {
  return pencilSets.flatMap(set =>
    set.colors.map(color => ({
      number: color.number,
      name: color.name,
      hex: color.hex,
      brand: set.brand,
      setId: set.id,
    }))
  );
}

/**
 * Returns a pencil set by its id, or null if not found.
 * @param {string} id
 * @returns {Array<{id: string, brand: string, name: string, colors: Array<{number: string, name: string, hex: string}>}> | null}
 */
export function getSetById(id) {
  return pencilSets.find(s => s.id === id) || null;
}
