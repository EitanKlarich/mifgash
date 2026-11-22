import React from 'react';
import {
  Trophy,
  Tent,
  Mountain,
  Sun,
  Film,
  Utensils,
  Coffee,
  PartyPopper,
  Music,
  Gamepad2,
  Dumbbell,
  Bike,
  Target,
  ShoppingBag,
  Briefcase,
  Plane,
  Calendar,
  Camera,
  Layers,
  Palette,
  Sparkles,
  Flame,
  Tv,
} from 'lucide-react';

interface CategoryIconProps {
  title: string;
  className?: string;
}

// Crisp, dedicated Basketball Icon SVG
const BasketballIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M5.5 5.5a11.9 11.9 0 0 1 13 13" />
    <path d="M18.5 5.5a11.9 11.9 0 0 0-13 13" />
    <line x1="12" y1="2" x2="12" y2="22" />
    <line x1="2" y1="12" x2="22" y2="12" />
  </svg>
);

// Helper for unified category theme styling
const UNIFIED_CATEGORY_COLOR = 'text-[#7F76D3] bg-[#25223D] border-[#283149]';

export const getCategoryIconInfo = (title: string, contextDescription?: string) => {
  const combined = `${title || ''} ${contextDescription || ''}`.toLowerCase().trim();
  // Normalize punctuation and extra spaces
  const clean = combined.replace(/[^a-z0-9\s-]/g, ' ');
  const words = clean.split(/\s+/).filter(Boolean);

  // Helper matcher
  const hasKeyword = (keywords: string[]) => {
    return keywords.some((kw) => {
      if (kw.includes(' ')) {
        return clean.includes(kw);
      }
      return words.some((w) => w === kw || w.startsWith(kw) || w.endsWith(kw)) || clean.includes(kw);
    });
  };

  // 1. Basketball & Hoops (Smart semantic matching for basketball)
  if (
    hasKeyword([
      'basketball',
      'hoop',
      'hoops',
      'b-ball',
      'bball',
      'nba',
      'dunk',
      'dunking',
      'shootaround',
      'pickup game',
      'pickup basketball',
      'streetball',
      'free throws',
      'layup',
      '3v3',
      '5v5',
      'court',
      'courts',
      'half court',
      'full court',
      'fiba',
      'spalding',
      'wilson',
    ])
  ) {
    return {
      Icon: BasketballIcon,
      label: 'Basketball',
      colorClass: UNIFIED_CATEGORY_COLOR,
    };
  }

  // 2. Soccer & Football (Association football)
  if (
    hasKeyword([
      'soccer',
      'futbol',
      'fútbol',
      'fifa',
      'world cup',
      'kickoff',
      'kickabout',
      'premier league',
      'champions league',
      'mls',
      'penalty',
      'pitch',
      'striker',
      'goalie',
    ])
  ) {
    return {
      Icon: Trophy,
      label: 'Soccer',
      colorClass: UNIFIED_CATEGORY_COLOR,
    };
  }

  // 3. American Football / Rugby
  if (
    hasKeyword([
      'football',
      'nfl',
      'touchdown',
      'superbowl',
      'super bowl',
      'tailgate',
      'rugby',
      'quarterback',
      'gridiron',
      'flag football',
    ])
  ) {
    return {
      Icon: Trophy,
      label: 'Football',
      colorClass: UNIFIED_CATEGORY_COLOR,
    };
  }

  // 4. Racquet Sports (Tennis, Pickleball, Badminton, Squash, Padel, Table Tennis)
  if (
    hasKeyword([
      'tennis',
      'pickleball',
      'badminton',
      'squash',
      'padel',
      'ping pong',
      'table tennis',
      'racquet',
      'racket',
      'wimbledon',
      'serve',
      'volley',
    ])
  ) {
    return {
      Icon: Target,
      label: 'Racquet Sports',
      colorClass: UNIFIED_CATEGORY_COLOR,
    };
  }

  // 5. Baseball & Softball
  if (
    hasKeyword([
      'baseball',
      'softball',
      'mlb',
      'home run',
      'pitcher',
      'batting',
      'batting cage',
      'catcher',
      'innings',
      'dugout',
    ])
  ) {
    return {
      Icon: Trophy,
      label: 'Baseball',
      colorClass: UNIFIED_CATEGORY_COLOR,
    };
  }

  // 6. Camping & Bonfire
  if (
    hasKeyword([
      'camp',
      'camping',
      'tent',
      'bonfire',
      'campfire',
      'cabin',
      's mores',
      'smores',
      'campsite',
      'wilderness',
      'woods',
    ])
  ) {
    return {
      Icon: Tent,
      label: 'Camping',
      colorClass: UNIFIED_CATEGORY_COLOR,
    };
  }

  // 7. Hiking & Mountaineering
  if (
    hasKeyword([
      'hike',
      'hiking',
      'trail',
      'mountain',
      'mountains',
      'summit',
      'trek',
      'trekking',
      'climb',
      'climbing',
      'bouldering',
      'backpacking',
      'nature walk',
      'scenic route',
    ])
  ) {
    return {
      Icon: Mountain,
      label: 'Hiking',
      colorClass: UNIFIED_CATEGORY_COLOR,
    };
  }

  // 8. Beach, Pool & Water Activities
  if (
    hasKeyword([
      'beach',
      'lake',
      'swim',
      'swimming',
      'pool',
      'surf',
      'surfing',
      'kayak',
      'kayaking',
      'paddle',
      'paddleboard',
      'paddleboarding',
      'ocean',
      'seaside',
      'snorkeling',
      'scuba',
      'boat',
      'boating',
      'sailing',
    ])
  ) {
    return {
      Icon: Sun,
      label: 'Beach & Water',
      colorClass: UNIFIED_CATEGORY_COLOR,
    };
  }

  // 9. Dining, Meals & Restaurants
  if (
    hasKeyword([
      'dinner',
      'lunch',
      'breakfast',
      'brunch',
      'food',
      'pizza',
      'eat',
      'eating',
      'bbq',
      'barbecue',
      'grill',
      'grilling',
      'restaurant',
      'tacos',
      'taco',
      'burger',
      'burgers',
      'sushi',
      'cookout',
      'potluck',
      'ramen',
      'pasta',
      'steak',
      'buffet',
      'dining',
      'culinary',
      'chef',
      'bakery',
      'tasting',
    ])
  ) {
    return {
      Icon: Utensils,
      label: 'Dining & Food',
      colorClass: UNIFIED_CATEGORY_COLOR,
    };
  }

  // 10. Coffee & Tea
  if (
    hasKeyword([
      'coffee',
      'cafe',
      'café',
      'tea',
      'boba',
      'espresso',
      'latte',
      'cappuccino',
      'matcha',
      'starbucks',
      'roaster',
      'roastery',
      'chai',
      'cold brew',
    ])
  ) {
    return {
      Icon: Coffee,
      label: 'Coffee & Cafe',
      colorClass: UNIFIED_CATEGORY_COLOR,
    };
  }

  // 11. Celebration, Birthday & Nightlife Drinks
  if (
    hasKeyword([
      'party',
      'birthday',
      'celebrat',
      'celebration',
      'drinks',
      'bar',
      'pub',
      'cocktail',
      'cocktails',
      'club',
      'clubbing',
      'cheers',
      'night out',
      'happy hour',
      'brewery',
      'beer',
      'wine',
      'winery',
      'toast',
      'anniversary',
      'gala',
      'bash',
    ])
  ) {
    return {
      Icon: PartyPopper,
      label: 'Celebration',
      colorClass: UNIFIED_CATEGORY_COLOR,
    };
  }

  // 12. Movies, Cinema & TV Watching
  if (
    hasKeyword([
      'movie',
      'movies',
      'film',
      'cinema',
      'theater',
      'theatre',
      'show',
      'screening',
      'watch',
      'popcorn',
      'premiere',
      'imax',
      'netflix',
      'watch party',
      'binge',
      'episode',
    ])
  ) {
    return {
      Icon: Film,
      label: 'Entertainment',
      colorClass: UNIFIED_CATEGORY_COLOR,
    };
  }

  // 13. Music & Concerts
  if (
    hasKeyword([
      'music',
      'concert',
      'jam',
      'band',
      'gig',
      'festival',
      'singing',
      'karaoke',
      'dj',
      'orchestra',
      'symphony',
      'acoustic',
      'live music',
      'rehearsal',
      'album',
    ])
  ) {
    return {
      Icon: Music,
      label: 'Music',
      colorClass: UNIFIED_CATEGORY_COLOR,
    };
  }

  // 14. Gaming, Esports & Board Games
  if (
    hasKeyword([
      'game',
      'gaming',
      'esport',
      'esports',
      'board game',
      'board games',
      'lan',
      'twitch',
      'ps5',
      'playstation',
      'xbox',
      'nintendo',
      'switch',
      'd&d',
      'dungeons',
      'dragons',
      'catan',
      'poker',
      'trivia',
      'smash bros',
      'valorant',
      'fortnite',
    ])
  ) {
    return {
      Icon: Gamepad2,
      label: 'Gaming',
      colorClass: UNIFIED_CATEGORY_COLOR,
    };
  }

  // 15. Gym, Fitness & Running
  if (
    hasKeyword([
      'gym',
      'workout',
      'fitness',
      'lift',
      'lifting',
      'weights',
      'run',
      'running',
      'jog',
      'jogging',
      'yoga',
      'pilates',
      'crossfit',
      'marathon',
      '5k',
      '10k',
      'hiit',
      'training',
      'exercise',
      'cardio',
    ])
  ) {
    return {
      Icon: Dumbbell,
      label: 'Fitness',
      colorClass: UNIFIED_CATEGORY_COLOR,
    };
  }

  // 16. Cycling & Biking
  if (
    hasKeyword([
      'bike',
      'biking',
      'cycling',
      'cycle',
      'ride',
      'spin class',
      'peloton',
      'mountain bike',
      'cyclist',
      'biker',
      'velodrome',
    ])
  ) {
    return {
      Icon: Bike,
      label: 'Cycling',
      colorClass: UNIFIED_CATEGORY_COLOR,
    };
  }

  // 17. Bowling, Darts, Arcade & Activities
  if (
    hasKeyword([
      'bowl',
      'bowling',
      'target',
      'darts',
      'arcade',
      'laser tag',
      'escape room',
      'axe throwing',
      'billiards',
      'pool hall',
      'mini golf',
      'kart',
      'karting',
      'go-kart',
    ])
  ) {
    return {
      Icon: Target,
      label: 'Activities',
      colorClass: UNIFIED_CATEGORY_COLOR,
    };
  }

  // 18. Shopping & Markets
  if (
    hasKeyword([
      'shop',
      'shopping',
      'mall',
      'market',
      'thrifting',
      'thrift',
      'flea market',
      'bazaar',
      'groceries',
      'outlets',
      'boutique',
    ])
  ) {
    return {
      Icon: ShoppingBag,
      label: 'Shopping',
      colorClass: UNIFIED_CATEGORY_COLOR,
    };
  }

  // 19. Work, Study, Hackathons & Coding
  if (
    hasKeyword([
      'work',
      'meeting',
      'office',
      'study',
      'workshop',
      'hackathon',
      'coding',
      'sprint',
      'standup',
      'coworking',
      'library',
      'sync',
      'brainstorm',
      'seminar',
      'class',
      'lecture',
    ])
  ) {
    return {
      Icon: Briefcase,
      label: 'Work & Study',
      colorClass: UNIFIED_CATEGORY_COLOR,
    };
  }

  // 20. Travel, Trips & Vacations
  if (
    hasKeyword([
      'flight',
      'trip',
      'travel',
      'vacation',
      'road trip',
      'cruise',
      'getaway',
      'airport',
      'hotel',
      'resort',
      'airbnb',
      'journey',
      'weekend away',
    ])
  ) {
    return {
      Icon: Plane,
      label: 'Travel',
      colorClass: UNIFIED_CATEGORY_COLOR,
    };
  }

  // 21. Photography & Visual Arts
  if (
    hasKeyword([
      'photo',
      'photograph',
      'photography',
      'photoshoot',
      'shoot',
      'camera',
      'picture',
      'art',
      'museum',
      'gallery',
      'painting',
      'drawing',
      'exhibition',
      'pottery',
    ])
  ) {
    return {
      Icon: Camera,
      label: 'Creative & Arts',
      colorClass: UNIFIED_CATEGORY_COLOR,
    };
  }

  return {
    Icon: Calendar,
    label: 'Plan',
    colorClass: UNIFIED_CATEGORY_COLOR,
  };
};

export const CategoryIcon: React.FC<CategoryIconProps> = ({ title, className = 'w-4 h-4' }) => {
  const { Icon } = getCategoryIconInfo(title);
  return <Icon className={className} />;
};


