import { mockCategoryData, mockSeasonalData } from "./api-responses";

export const mockSiteData = {
  brand: {
    name: "ColorVerse",
    vision: "Bringing creativity to life",
  },
  seasonal_gallery: mockSeasonalData.spring,
  categories: mockCategoryData,
  daily_pick: {
    title: "Today's Special",
    item: {
      title: "Mystical Garden",
      description: "Serene garden coloring page",
    },
  },
};
