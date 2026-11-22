import authHeroEvening from '../assets/images/auth_hero_evening_1795309405369.jpg';
import friendsCover from '../assets/images/group_cover_friends_1795309405974.jpg';
import outdoorsCover from '../assets/images/group_cover_outdoors_1795309405799.jpg';
import diningCover from '../assets/images/group_cover_dining_1795309405074.jpg';
import sportsCover from '../assets/images/group_cover_sports_1795309405755.jpg';

export interface EventThemeArtwork {
  imageUrl: string;
  fallbackGradient: string;
  accentColor: string;
  category: string;
}

export const THEME_ARTWORKS: Record<string, EventThemeArtwork> = {
  cooking: {
    imageUrl: diningCover,
    fallbackGradient: 'from-[#8B5A2B]/80 via-[#5C3A21]/90 to-[#121724]',
    accentColor: '#E6A23C',
    category: 'Cooking & Food',
  },
  camping: {
    imageUrl: outdoorsCover,
    fallbackGradient: 'from-[#2D5A27]/80 via-[#1E3F1A]/90 to-[#121724]',
    accentColor: '#67C23A',
    category: 'Outdoors & Camping',
  },
  basketball: {
    imageUrl: sportsCover,
    fallbackGradient: 'from-[#D35400]/80 via-[#962D00]/90 to-[#121724]',
    accentColor: '#FF9900',
    category: 'Basketball & Sports',
  },
  soccer: {
    imageUrl: sportsCover,
    fallbackGradient: 'from-[#196F3D]/80 via-[#114B29]/90 to-[#121724]',
    accentColor: '#2ECC71',
    category: 'Soccer & Athletics',
  },
  movie: {
    imageUrl: authHeroEvening,
    fallbackGradient: 'from-[#1B263B]/90 via-[#0D1B2A]/90 to-[#121724]',
    accentColor: '#3498DB',
    category: 'Cinema & Movies',
  },
  beach: {
    imageUrl: outdoorsCover,
    fallbackGradient: 'from-[#D48B38]/80 via-[#B05B20]/90 to-[#121724]',
    accentColor: '#F39C12',
    category: 'Beach & Sunset',
  },
  boardgames: {
    imageUrl: friendsCover,
    fallbackGradient: 'from-[#6C3483]/80 via-[#4A235A]/90 to-[#121724]',
    accentColor: '#9B59B6',
    category: 'Games & Trivia',
  },
  party: {
    imageUrl: authHeroEvening,
    fallbackGradient: 'from-[#884EA0]/80 via-[#512E5F]/90 to-[#121724]',
    accentColor: '#BB8FCE',
    category: 'Party & Celebration',
  },
  hiking: {
    imageUrl: outdoorsCover,
    fallbackGradient: 'from-[#1A5276]/80 via-[#154360]/90 to-[#121724]',
    accentColor: '#5DADE2',
    category: 'Hiking & Mountains',
  },
  coffee: {
    imageUrl: diningCover,
    fallbackGradient: 'from-[#6E2C00]/80 via-[#4E2000]/90 to-[#121724]',
    accentColor: '#D35400',
    category: 'Coffee & Cafe',
  },
  dinner: {
    imageUrl: diningCover,
    fallbackGradient: 'from-[#78281F]/80 via-[#511812]/90 to-[#121724]',
    accentColor: '#E74C3C',
    category: 'Dinner & Dining',
  },
  work: {
    imageUrl: friendsCover,
    fallbackGradient: 'from-[#2C3E50]/90 via-[#1A252F]/90 to-[#121724]',
    accentColor: '#8E84E4',
    category: 'Work & Study',
  },
  concert: {
    imageUrl: authHeroEvening,
    fallbackGradient: 'from-[#4A235A]/80 via-[#1B2235]/90 to-[#121724]',
    accentColor: '#AF7AC5',
    category: 'Concert & Music',
  },
  roadtrip: {
    imageUrl: outdoorsCover,
    fallbackGradient: 'from-[#1F618D]/80 via-[#154360]/90 to-[#121724]',
    accentColor: '#5499C7',
    category: 'Travel & Trip',
  },
  lake: {
    imageUrl: outdoorsCover,
    fallbackGradient: 'from-[#1B4F72]/80 via-[#154360]/90 to-[#121724]',
    accentColor: '#3498DB',
    category: 'Lake & Getaway',
  },
};

export function getEventThemeArtwork(
  title: string = '',
  description: string = '',
  customCover?: string
): EventThemeArtwork {
  if (customCover) {
    return {
      imageUrl: customCover,
      fallbackGradient: 'from-[#1B2235]/90 via-[#121724]/90 to-[#121724]',
      accentColor: '#8E84E4',
      category: 'Custom',
    };
  }

  const query = `${title} ${description}`.toLowerCase();

  if (/cook|bake|chef|recipe|culinary|food|kitchen|taco|pizza|burger|meal|brunch|lunch|breakfast/.test(query)) {
    return THEME_ARTWORKS.cooking;
  }
  if (/camp|tent|flagstaff|lava tube|backpack|cabin|wilderness|forest|campfire|national park/.test(query)) {
    return THEME_ARTWORKS.camping;
  }
  if (/basketball|hoop|nba|dunk|court|3v3|layup/.test(query)) {
    return THEME_ARTWORKS.basketball;
  }
  if (/soccer|football|kick|pitch|striker|match|goal|fifa/.test(query)) {
    return THEME_ARTWORKS.soccer;
  }
  if (/movie|cinema|film|imax|theatre|theater|odyssey|screening|popcorn|watch party/.test(query)) {
    return THEME_ARTWORKS.movie;
  }
  if (/beach|pier|sunset|ocean|surf|bonfire|coastal|sand|wave/.test(query)) {
    return THEME_ARTWORKS.beach;
  }
  if (/board game|catan|codenames|trivia|game night|poker|chess|cards|arcade/.test(query)) {
    return THEME_ARTWORKS.boardgames;
  }
  if (/party|celebration|birthday|reunion|anniversary|club|dance|cocktail/.test(query)) {
    return THEME_ARTWORKS.party;
  }
  if (/hike|trail|mountain|summit|climb|nature walk/.test(query)) {
    return THEME_ARTWORKS.hiking;
  }
  if (/coffee|cafe|espresso|latte|tea|pastry/.test(query)) {
    return THEME_ARTWORKS.coffee;
  }
  if (/dinner|supper|restaurant|sushi|bistro|bbq|steak/.test(query)) {
    return THEME_ARTWORKS.dinner;
  }
  if (/concert|music|festival|band|dj|live gig|orchestra|acoustic/.test(query)) {
    return THEME_ARTWORKS.concert;
  }
  if (/trip|road trip|travel|flight|tour|vacation|getaway|drive/.test(query)) {
    return THEME_ARTWORKS.roadtrip;
  }
  if (/lake|lakehouse|boat|kayak|water ski|marina/.test(query)) {
    return THEME_ARTWORKS.lake;
  }
  if (/study|work|hackathon|meeting|sprint|office|workshop|presentation/.test(query)) {
    return THEME_ARTWORKS.work;
  }

  return THEME_ARTWORKS.party;
}

export interface MonthBanner {
  monthName: string;
  year: number;
  bannerImage: string;
  tagline: string;
}

export const MONTH_BANNERS: Record<number, { bannerImage: string; tagline: string }> = {
  0: { bannerImage: outdoorsCover, tagline: 'Winter Calm & New Beginnings' },
  1: { bannerImage: diningCover, tagline: 'Cozy Mid-Winter Gatherings' },
  2: { bannerImage: friendsCover, tagline: 'Early Blooms & Catch-Ups' },
  3: { bannerImage: outdoorsCover, tagline: 'Fresh Spring Skies' },
  4: { bannerImage: friendsCover, tagline: 'Long Days & Outdoor Plans' },
  5: { bannerImage: sportsCover, tagline: 'Summer Kickoff & Evening Games' },
  6: { bannerImage: outdoorsCover, tagline: 'Mid-Summer Adventures' },
  7: { bannerImage: authHeroEvening, tagline: 'Late Summer Evenings' },
  8: { bannerImage: diningCover, tagline: 'Crisp Autumn Dinners' },
  9: { bannerImage: outdoorsCover, tagline: 'Golden Trails & Fall Nights' },
  10: { bannerImage: diningCover, tagline: 'Cozy Gatherings & Hearth' },
  11: { bannerImage: authHeroEvening, tagline: 'Winter Festivities & Lights' },
};

export function getMonthBanner(date: Date): MonthBanner {
  const monthIndex = date.getMonth();
  const monthName = date.toLocaleDateString('en-US', { month: 'long' });
  const year = date.getFullYear();
  const config = MONTH_BANNERS[monthIndex] || MONTH_BANNERS[0];

  return {
    monthName,
    year,
    bannerImage: config.bannerImage,
    tagline: config.tagline,
  };
}

export interface DayOccurrence {
  event: any;
  dateStr: string;
  dayNumber: number;
  totalDays: number;
  isFirstDay: boolean;
  isLastDay: boolean;
}

export function parseDateOnly(dateStr: string): Date {
  const parts = dateStr.split('-').map((p) => parseInt(p, 10));
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

export function formatDateToIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function expandEventOccurrences(events: any[]): Record<string, DayOccurrence[]> {
  const dateMap: Record<string, DayOccurrence[]> = {};

  events.forEach((ev) => {
    const startDate = parseDateOnly(ev.date);
    const endDate = ev.endDate ? parseDateOnly(ev.endDate) : startDate;

    const diffTime = endDate.getTime() - startDate.getTime();
    const diffDays = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1);

    for (let i = 0; i < diffDays; i++) {
      const current = new Date(startDate);
      current.setDate(startDate.getDate() + i);
      const isoKey = formatDateToIso(current);

      if (!dateMap[isoKey]) {
        dateMap[isoKey] = [];
      }

      dateMap[isoKey].push({
        event: ev,
        dateStr: isoKey,
        dayNumber: i + 1,
        totalDays: diffDays,
        isFirstDay: i === 0,
        isLastDay: i === diffDays - 1,
      });
    }
  });

  return dateMap;
}
