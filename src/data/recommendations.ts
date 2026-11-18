import { siteConfig } from '../site.config';

export interface RecommendationItem {
  initials: string;
  paragraphs: string[];
}

export const LINKEDIN_PROFILE_URL = siteConfig.socials.linkedin ?? '';

export const featuredRecommendation: RecommendationItem = {
  initials: 'EK',
  paragraphs: [
    '“I worked alongside Kevin through all of college, and he was the person I wanted on every project, especially during the late nights we spent building our compiler from the ground up. He never stopped digging until a problem was solved, and his patience and clear thinking made even the hardest assignments feel manageable.”'
  ],
};

export const leftStackRecommendations: RecommendationItem[] = [
  {
    initials: 'RW',
    paragraphs: [
      '“Kevin was thoughtful and collaborative, and he built our inventory system in a way that fit easily into how we already work.”',
    ],
  },
];

export const midLeftRecommendation: RecommendationItem = {
  initials: 'KC',
  paragraphs: [
    '"Kevin was our superstar coordinator between the UT-Dallas students, faculty & TMNA. He did an excellent job!"',
  ],
};

export const midRightRecommendation: RecommendationItem = {
  initials: 'MC',
  paragraphs: [
    '“When we hit the limits of what we thought Shopify could do, Kevin dug in and found a way to make it work. He expanded our system well beyond what we’d imagined.”',
  ],
};

export const rightStackRecommendations: RecommendationItem[] = [
  {
    initials: 'MH',
    paragraphs: [
      '“Planning our first event was new territory for us, but Kevin made it easy. He communicated clearly and set up meetings that worked around our schedule and changing needs.”',
    ],
  },
];
