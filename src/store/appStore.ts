import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { 
  User, 
  SurveyOpportunity, 
  Task, 
  UserProfile, 
  EarningsEntry, 
  CustomSurvey,
  DashboardStats,
  Notification 
} from '@/types';

interface AppState {
  // User
  currentUser: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;

  // Dashboard Stats
  stats: DashboardStats;
  updateStats: (stats: Partial<DashboardStats>) => void;

  // Survey Opportunities
  opportunities: SurveyOpportunity[];
  addOpportunity: (opportunity: SurveyOpportunity) => void;
  updateOpportunity: (id: string, updates: Partial<SurveyOpportunity>) => void;
  removeOpportunity: (id: string) => void;
  startOpportunity: (id: string) => void;
  completeOpportunity: (id: string) => void;

  // Tasks (Kanban)
  tasks: Task[];
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  removeTask: (id: string) => void;
  moveTask: (id: string, newStatus: Task['status']) => void;

  // User Profiles (Form Assistant)
  profiles: UserProfile[];
  activeProfile: UserProfile | null;
  addProfile: (profile: UserProfile) => void;
  updateProfile: (id: string, updates: Partial<UserProfile>) => void;
  removeProfile: (id: string) => void;
  setActiveProfile: (profile: UserProfile | null) => void;

  // Earnings
  earnings: EarningsEntry[];
  addEarning: (earning: EarningsEntry) => void;
  getEarningsByPeriod: (startDate: Date, endDate: Date) => EarningsEntry[];

  // Custom Surveys
  customSurveys: CustomSurvey[];
  addCustomSurvey: (survey: CustomSurvey) => void;
  updateCustomSurvey: (id: string, updates: Partial<CustomSurvey>) => void;
  removeCustomSurvey: (id: string) => void;
  addResponse: (surveyId: string, response: any) => void;

  // Notifications
  notifications: Notification[];
  addNotification: (notification: Notification) => void;
  markNotificationAsRead: (id: string) => void;
  clearNotifications: () => void;

  // UI State
  activeSection: string;
  setActiveSection: (section: string) => void;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

const initialStats: DashboardStats = {
  totalEarnings: 1247.50,
  activeSurveys: 12,
  completedToday: 5,
  hourlyRate: 18.50,
  weeklyEarnings: 145.75,
  monthlyEarnings: 587.00,
  pendingPayouts: 125.00,
  completionRate: 78,
};

const sampleOpportunities: SurveyOpportunity[] = [
  {
    id: '1',
    platformId: 'swagbucks',
    platformName: 'Swagbucks',
    title: 'Tech Insights Survey',
    description: 'Share your opinions on the latest technology trends and devices',
    reward: 2.50,
    estimatedTime: 10,
    category: 'Technology',
    urgency: 'high',
    status: 'available',
    createdAt: new Date(),
  },
  {
    id: '2',
    platformId: 'surveyjunkie',
    platformName: 'Survey Junkie',
    title: 'Consumer Habits Study',
    description: 'Help brands understand modern consumer purchasing behavior',
    reward: 5.00,
    estimatedTime: 15,
    category: 'Consumer',
    urgency: 'medium',
    status: 'available',
    createdAt: new Date(),
  },
  {
    id: '3',
    platformId: 'prolific',
    platformName: 'Prolific',
    title: 'Gaming Preferences Research',
    description: 'Academic research on gaming habits and preferences',
    reward: 3.00,
    estimatedTime: 12,
    category: 'Gaming',
    urgency: 'low',
    status: 'available',
    createdAt: new Date(),
  },
  {
    id: '4',
    platformId: 'branded',
    platformName: 'Branded Surveys',
    title: 'Health & Wellness Survey',
    description: 'Share your health and wellness routines',
    reward: 4.50,
    estimatedTime: 20,
    category: 'Health',
    urgency: 'medium',
    status: 'available',
    createdAt: new Date(),
  },
  {
    id: '5',
    platformId: 'pinecone',
    platformName: 'Pinecone Research',
    title: 'Product Testing Opportunity',
    description: 'Test new products before they hit the market',
    reward: 3.00,
    estimatedTime: 15,
    category: 'Product Testing',
    urgency: 'high',
    status: 'available',
    createdAt: new Date(),
  },
];

const sampleTasks: Task[] = [
  {
    id: '1',
    title: 'Complete Profile Setup',
    description: 'Fill out all demographic information on Swagbucks',
    platform: 'Swagbucks',
    reward: 2.00,
    estimatedTime: 10,
    status: 'todo',
    priority: 'high',
    tags: ['profile', 'setup'],
    createdAt: new Date(),
  },
  {
    id: '2',
    title: 'Update Demographics',
    description: 'Update age and location information',
    platform: 'Survey Junkie',
    reward: 0.50,
    estimatedTime: 5,
    status: 'todo',
    priority: 'medium',
    tags: ['profile', 'update'],
    createdAt: new Date(),
  },
  {
    id: '3',
    title: 'Tech Survey #45',
    description: 'Complete the technology preferences survey',
    platform: 'Prolific',
    reward: 3.50,
    estimatedTime: 15,
    status: 'in-progress',
    priority: 'high',
    tags: ['survey', 'tech'],
    createdAt: new Date(),
  },
  {
    id: '4',
    title: 'Daily Poll',
    description: 'Quick daily opinion poll',
    platform: 'Swagbucks',
    reward: 0.10,
    estimatedTime: 1,
    status: 'done',
    priority: 'low',
    tags: ['daily', 'quick'],
    createdAt: new Date(),
    completedAt: new Date(),
  },
  {
    id: '5',
    title: 'Bonus Task - Watch Videos',
    description: 'Watch promotional videos for bonus points',
    platform: 'InboxDollars',
    reward: 1.00,
    estimatedTime: 20,
    status: 'done',
    priority: 'low',
    tags: ['bonus', 'videos'],
    createdAt: new Date(),
    completedAt: new Date(),
  },
];

const sampleProfiles: UserProfile[] = [
  {
    id: '1',
    name: 'Main Profile',
    email: 'user@example.com',
    phone: '+1 (555) 123-4567',
    dateOfBirth: new Date('1990-05-15'),
    gender: 'Male',
    location: {
      country: 'United States',
      city: 'New York',
      zipCode: '10001',
    },
    demographics: {
      education: 'Bachelor\'s Degree',
      occupation: 'Software Developer',
      income: '$50,000 - $75,000',
      householdSize: 2,
    },
    interests: ['Technology', 'Gaming', 'Fitness', 'Travel'],
    platforms: ['Swagbucks', 'Survey Junkie', 'Prolific'],
  },
];

const sampleEarnings: EarningsEntry[] = [
  { id: '1', platform: 'Swagbucks', amount: 12.50, date: new Date(), type: 'survey', description: 'Tech Insights Survey' },
  { id: '2', platform: 'Survey Junkie', amount: 5.00, date: new Date(), type: 'survey', description: 'Consumer Habits' },
  { id: '3', platform: 'Prolific', amount: 8.00, date: new Date(Date.now() - 86400000), type: 'survey', description: 'Academic Research' },
  { id: '4', platform: 'Swagbucks', amount: 2.00, date: new Date(Date.now() - 86400000), type: 'bonus', description: 'Daily Goal Bonus' },
  { id: '5', platform: 'InboxDollars', amount: 3.50, date: new Date(Date.now() - 172800000), type: 'task', description: 'Video Watching' },
];

const sampleSurveys: CustomSurvey[] = [
  {
    id: '1',
    title: 'Product Feedback Survey',
    description: 'Gathering feedback on our new product features',
    createdBy: 'user1',
    questions: [
      {
        id: 'q1',
        type: 'rating',
        question: 'How satisfied are you with our product?',
        required: true,
        minRating: 1,
        maxRating: 5,
      },
      {
        id: 'q2',
        type: 'text',
        question: 'What features would you like to see added?',
        required: false,
      },
    ],
    responses: [],
    status: 'active',
    createdAt: new Date(),
  },
];

const sampleNotifications: Notification[] = [
  {
    id: '1',
    title: 'New High-Paying Survey',
    message: 'A $5.00 survey is available on Survey Junkie!',
    type: 'success',
    read: false,
    createdAt: new Date(),
  },
  {
    id: '2',
    title: 'Daily Goal Reached',
    message: 'Congratulations! You\'ve reached your daily earnings goal.',
    type: 'success',
    read: false,
    createdAt: new Date(Date.now() - 3600000),
  },
];

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // User
      currentUser: null,
      isAuthenticated: false,
      setUser: (user) => set({ currentUser: user, isAuthenticated: !!user }),
      login: async (email, _password) => {
        // Simulate login - in production, validate credentials
        const mockUser: User = {
          id: '1',
          name: 'John Doe',
          email,
          createdAt: new Date(),
        };
        set({ currentUser: mockUser, isAuthenticated: true });
        return true;
      },
      logout: () => set({ currentUser: null, isAuthenticated: false }),

      // Dashboard Stats
      stats: initialStats,
      updateStats: (newStats) => set((state) => ({ 
        stats: { ...state.stats, ...newStats } 
      })),

      // Survey Opportunities
      opportunities: sampleOpportunities,
      addOpportunity: (opportunity) => set((state) => ({ 
        opportunities: [...state.opportunities, opportunity] 
      })),
      updateOpportunity: (id, updates) => set((state) => ({
        opportunities: state.opportunities.map(o => 
          o.id === id ? { ...o, ...updates } : o
        )
      })),
      removeOpportunity: (id) => set((state) => ({
        opportunities: state.opportunities.filter(o => o.id !== id)
      })),
      startOpportunity: (id) => set((state) => ({
        opportunities: state.opportunities.map(o => 
          o.id === id ? { ...o, status: 'started' as const } : o
        )
      })),
      completeOpportunity: (id) => set((state) => {
        const opportunity = state.opportunities.find(o => o.id === id);
        if (opportunity) {
          const earning: EarningsEntry = {
            id: Date.now().toString(),
            platform: opportunity.platformName,
            amount: opportunity.reward,
            date: new Date(),
            type: 'survey',
            description: opportunity.title,
          };
          return {
            opportunities: state.opportunities.map(o => 
              o.id === id ? { ...o, status: 'completed' as const } : o
            ),
            earnings: [...state.earnings, earning],
            stats: {
              ...state.stats,
              totalEarnings: state.stats.totalEarnings + opportunity.reward,
              completedToday: state.stats.completedToday + 1,
            }
          };
        }
        return state;
      }),

      // Tasks
      tasks: sampleTasks,
      addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
      updateTask: (id, updates) => set((state) => ({
        tasks: state.tasks.map(t => t.id === id ? { ...t, ...updates } : t)
      })),
      removeTask: (id) => set((state) => ({
        tasks: state.tasks.filter(t => t.id !== id)
      })),
      moveTask: (id, newStatus) => set((state) => ({
        tasks: state.tasks.map(t => 
          t.id === id ? { 
            ...t, 
            status: newStatus,
            completedAt: newStatus === 'done' ? new Date() : t.completedAt
          } : t
        )
      })),

      // Profiles
      profiles: sampleProfiles,
      activeProfile: sampleProfiles[0],
      addProfile: (profile) => set((state) => ({ 
        profiles: [...state.profiles, profile] 
      })),
      updateProfile: (id, updates) => set((state) => ({
        profiles: state.profiles.map(p => 
          p.id === id ? { ...p, ...updates } : p
        )
      })),
      removeProfile: (id) => set((state) => ({
        profiles: state.profiles.filter(p => p.id !== id)
      })),
      setActiveProfile: (profile) => set({ activeProfile: profile }),

      // Earnings
      earnings: sampleEarnings,
      addEarning: (earning) => set((state) => ({ 
        earnings: [...state.earnings, earning] 
      })),
      getEarningsByPeriod: (startDate, endDate) => {
        return get().earnings.filter(e => 
          e.date >= startDate && e.date <= endDate
        );
      },

      // Custom Surveys
      customSurveys: sampleSurveys,
      addCustomSurvey: (survey) => set((state) => ({ 
        customSurveys: [...state.customSurveys, survey] 
      })),
      updateCustomSurvey: (id, updates) => set((state) => ({
        customSurveys: state.customSurveys.map(s => 
          s.id === id ? { ...s, ...updates } : s
        )
      })),
      removeCustomSurvey: (id) => set((state) => ({
        customSurveys: state.customSurveys.filter(s => s.id !== id)
      })),
      addResponse: (surveyId, response) => set((state) => ({
        customSurveys: state.customSurveys.map(s => 
          s.id === surveyId 
            ? { ...s, responses: [...s.responses, response] } 
            : s
        )
      })),

      // Notifications
      notifications: sampleNotifications,
      addNotification: (notification) => set((state) => ({ 
        notifications: [notification, ...state.notifications] 
      })),
      markNotificationAsRead: (id) => set((state) => ({
        notifications: state.notifications.map(n => 
          n.id === id ? { ...n, read: true } : n
        )
      })),
      clearNotifications: () => set({ notifications: [] }),

      // UI State
      activeSection: 'dashboard',
      setActiveSection: (section) => set({ activeSection: section }),
      sidebarOpen: false,
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    }),
    {
      name: 'surveyflow-storage',
      partialize: (state) => ({
        currentUser: state.currentUser,
        isAuthenticated: state.isAuthenticated,
        stats: state.stats,
        opportunities: state.opportunities,
        tasks: state.tasks,
        profiles: state.profiles,
        earnings: state.earnings,
        customSurveys: state.customSurveys,
      }),
    }
  )
);
