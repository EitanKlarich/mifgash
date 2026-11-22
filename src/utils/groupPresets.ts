import friendsCover from '../assets/images/group_cover_friends_1795309405974.jpg';
import outdoorsCover from '../assets/images/group_cover_outdoors_1795309405799.jpg';
import diningCover from '../assets/images/group_cover_dining_1795309405074.jpg';
import sportsCover from '../assets/images/group_cover_sports_1795309405755.jpg';

export interface GroupPhotoPreset {
  label: string;
  url: string;
}

export const PRESET_GROUP_PHOTOS: GroupPhotoPreset[] = [
  { label: 'Friends', url: friendsCover },
  { label: 'Dining', url: diningCover },
  { label: 'Outdoors', url: outdoorsCover },
  { label: 'Sports', url: sportsCover },
];
