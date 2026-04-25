export const GOOGLE_BUSINESS_PROFILE_URL =
  (import.meta as any).env?.VITE_GOOGLE_REVIEW_URL || 'https://g.page/r/CVmpd5dYUfULEBM/review';

export const SOCIAL_LINKS = [
  {
    key: 'linkedin',
    label: 'LinkedIn',
    url: 'https://www.linkedin.com/company/111465919/admin/analytics/followers/?invite=true',
    accent: '#0A66C2',
    description: 'Follow company updates, hiring activity, and employer announcements.',
    buttonLabel: 'Open LinkedIn',
  },
  {
    key: 'facebook',
    label: 'Facebook',
    url: 'https://www.facebook.com/profile.php?id=61572034422749',
    accent: '#1877F2',
    description: 'See posts, community updates, and public job highlights.',
    buttonLabel: 'Open Facebook',
  },
  {
    key: 'instagram',
    label: 'Instagram',
    url: 'https://www.instagram.com/falisha.manpower/',
    accent: '#E4405F',
    description: 'Watch stories, reels, and day-to-day agency highlights.',
    buttonLabel: 'Open Instagram',
  },
  {
    key: 'tiktok',
    label: 'TikTok',
    url: 'https://www.tiktok.com/@falishamanpower1',
    accent: '#111111',
    description: 'Short-form videos, worker stories, and new recruitment content.',
    buttonLabel: 'Open TikTok',
  },
  {
    key: 'x',
    label: 'X',
    url: 'https://x.com/Abidayubraja',
    accent: '#111111',
    description: 'Quick updates, announcements, and public-facing notices.',
    buttonLabel: 'Open X',
  },
  {
    key: 'youtube',
    label: 'YouTube',
    url: 'https://www.youtube.com/@Falishaoep',
    accent: '#FF0000',
    description: 'Longer videos, explainers, and channel updates.',
    buttonLabel: 'Open YouTube',
  },
  {
    key: 'whatsapp-channel',
    label: 'WhatsApp Channel',
    url: 'https://whatsapp.com/channel/0029Vb8jCt97YScug8d2mq12',
    accent: '#25D366',
    description: 'Join the channel for direct WhatsApp updates and announcements.',
    buttonLabel: 'Open WhatsApp Channel',
  },
] as const;

export const GOOGLE_BUSINESS_LINK = {
  key: 'google-business-profile',
  label: 'Google Business Profile',
  url: GOOGLE_BUSINESS_PROFILE_URL,
  accent: '#16a34a',
  description: 'Open the Google Business Profile and review page for Falisha.',
  buttonLabel: 'Open Google Profile',
} as const;

export type SocialLinkItem = (typeof SOCIAL_LINKS)[number];