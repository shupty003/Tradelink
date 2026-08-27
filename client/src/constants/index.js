/**
 * constants/index.js — Application-wide constants and presentation data.
 */

export const API_BASE_URL =
  import.meta.env.VITE_API_URL || '/api';

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  BROWSE: '/dashboard/browse',
  PUBLIC_BROWSE: '/browse',
  DASHBOARD: '/dashboard',
  PROFILE: '/dashboard/profile',
  MY_SKILLS: '/dashboard/skills',
  WALLET: '/dashboard/wallet',
  TRANSACTIONS: '/dashboard/transactions',
  WATCHLIST: '/dashboard/watchlist',
  TRADE_CHAINS: '/dashboard/trade-chains',
  ABOUT: '/about',
  CONTACT: '/contact',
};

export const BRAND = {
  name: 'TradeLink',
  shortName: 'TradeLink',
  legalName: 'TradeLink',
  location: 'Dhaka, Bangladesh',
  email: 'hello@tradelink.com.bd',
  phone: '+880 1700 000000',
};

export const NAV_LINKS = [
  { label: 'How It Works', to: '/#process' },
  { label: 'About', to: ROUTES.ABOUT },
  { label: 'Contact', to: ROUTES.CONTACT },
];

export const SKILL_CATEGORIES = [
  'Programming',
  'Graphic Design',
  'UI/UX',
  'Video Editing',
  'Writing',
  'Tutoring',
  'Music',
  'Photography',
  'Marketing',
  'Career Advice',
  'Language Learning',
  'Other',
];

export const EXPERIENCE_LEVELS = [
  'Beginner',
  'Intermediate',
  'Advanced',
  'Expert',
];

export const SKILL_STATUSES = [
  'active',
  'paused',
  'draft',
];

export const SKILL_LISTINGS = [
  {
    id: 1,
    title: 'React Frontend Support',
    member: 'Ayesha Rahman',
    initials: 'AR',
    category: 'Programming',
    availability: 'Available',
    rate: '৳1,500/hr',
    match: 92,
    location: 'Dhaka',
    tags: ['React', 'Tailwind CSS', 'API Integration'],
  },
  {
    id: 2,
    title: 'Brand Identity Design',
    member: 'Nabil Hasan',
    initials: 'NH',
    category: 'Graphic Design',
    availability: 'Limited',
    rate: '৳12,000/project',
    match: 84,
    location: 'Remote',
    tags: ['Logo', 'Social Kit', 'Pitch Deck'],
  },
  {
    id: 3,
    title: 'SEO Blog Writing',
    member: 'Tasmia Chowdhury',
    initials: 'TC',
    category: 'Writing',
    availability: 'Available',
    rate: '৳2,500/article',
    match: 88,
    location: 'Chattogram',
    tags: ['SEO', 'Research', 'Editing'],
  },
  {
    id: 4,
    title: 'Facebook Ads Setup',
    member: 'Imran Kabir',
    initials: 'IK',
    category: 'Marketing',
    availability: 'Available',
    rate: '৳8,000/campaign',
    match: 79,
    location: 'Sylhet',
    tags: ['Meta Ads', 'Analytics', 'Retargeting'],
  },
  {
    id: 5,
    title: 'Excel Dashboard Builder',
    member: 'Farzana Akter',
    initials: 'FA',
    category: 'Other',
    availability: 'Booked This Week',
    rate: '৳10,000/project',
    match: 81,
    location: 'Dhaka',
    tags: ['Excel', 'Power Query', 'Reporting'],
  },
  {
    id: 6,
    title: 'Virtual Admin Assistance',
    member: 'Sadia Islam',
    initials: 'SI',
    category: 'Career Advice',
    availability: 'Available',
    rate: '৳900/hr',
    match: 76,
    location: 'Remote',
    tags: ['Scheduling', 'Research', 'Documentation'],
  },
];

export const SERVICE_LINES = [
  {
    code: '01',
    title: 'Create A Member Profile',
    description: 'Members can later add skills, availability, portfolio links, rates, and preferred collaboration types from their dashboard.',
  },
  {
    code: '02',
    title: 'Browse Skills And Requests',
    description: 'The browse page provides placeholder filters and listing cards so teammates can connect live search, categories, and matching.',
  },
  {
    code: '03',
    title: 'Start A Collaboration',
    description: 'Project invitations, proposals, messaging, reviews, and status tracking can be implemented inside the dashboard routes.',
  },
];

export const PLATFORM_FEATURES = [
  {
    title: 'Member Profiles',
    description: 'Reusable profile structure for names, roles, skill tags, rates, availability, and portfolio references.',
  },
  {
    title: 'Skill Directory',
    description: 'Browse-ready mock data and UI states for category filtering, search, sorting, and listing summaries.',
  },
  {
    title: 'Collaboration Requests',
    description: 'Dashboard placeholders for incoming requests, proposals, active work, completed work, and reviews.',
  },
  {
    title: 'Authentication Flow',
    description: 'Login and registration screens are prepared for future API integration without pretending auth is complete.',
  },
  {
    title: 'Team Ownership',
    description: 'Route and component names separate public browsing from member dashboard work so feature owners can build independently.',
  },
  {
    title: 'Backend Hooks',
    description: 'The current service layer can be connected gradually to members, skills, requests, reviews, and messages.',
  },
];

export const TESTIMONIALS = [
  {
    id: 1,
    name: 'Mahmudul Karim',
    role: 'Frontend Developer',
    initials: 'MK',
    content:
      'The boilerplate gives me the route and page structure I need. I can focus on implementing skill search instead of rebuilding layout.',
  },
  {
    id: 2,
    name: 'Nusrat Jahan',
    role: 'UI Designer',
    initials: 'NJ',
    content:
      'The member cards and category placeholders make it easy to refine the visual design without changing the application flow.',
  },
  {
    id: 3,
    name: 'Farhan Ahmed',
    role: 'Backend Developer',
    initials: 'FA',
    content:
      'The frontend now exposes the data shape I need for members, skills, collaboration requests, and dashboard summaries.',
  },
];
