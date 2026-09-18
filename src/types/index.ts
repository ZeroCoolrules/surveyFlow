export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  createdAt: Date;
}

export interface SurveyPlatform {
  id: string;
  name: string;
  logo: string;
  url: string;
  minPayout: number;
  payoutMethods: string[];
  rating: number;
}

export interface SurveyOpportunity {
  id: string;
  platformId: string;
  platformName: string;
  title: string;
  description: string;
  reward: number;
  estimatedTime: number;
  category: string;
  urgency: 'low' | 'medium' | 'high';
  requirements?: string[];
  status: 'available' | 'started' | 'completed';
  createdAt: Date;
  expiresAt?: Date;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  platform: string;
  reward: number;
  estimatedTime: number;
  status: 'todo' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  tags: string[];
  createdAt: Date;
  completedAt?: Date;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  dateOfBirth?: Date;
  gender?: string;
  location?: {
    country: string;
    city: string;
    zipCode: string;
  };
  demographics?: {
    education: string;
    occupation: string;
    income: string;
    householdSize: number;
  };
  interests: string[];
  platforms: string[];
}

export interface EarningsEntry {
  id: string;
  platform: string;
  amount: number;
  date: Date;
  type: 'survey' | 'task' | 'bonus' | 'referral';
  description: string;
}

export interface CustomSurvey {
  id: string;
  title: string;
  description: string;
  createdBy: string;
  questions: SurveyQuestion[];
  responses: SurveyResponse[];
  status: 'draft' | 'active' | 'closed';
  createdAt: Date;
  endsAt?: Date;
}

export interface SurveyQuestion {
  id: string;
  type: 'text' | 'multiple_choice' | 'rating' | 'checkbox' | 'dropdown';
  question: string;
  required: boolean;
  options?: string[];
  minRating?: number;
  maxRating?: number;
}

export interface SurveyResponse {
  id: string;
  surveyId: string;
  respondentId: string;
  answers: Record<string, string | string[] | number>;
  submittedAt: Date;
}

export interface DashboardStats {
  totalEarnings: number;
  activeSurveys: number;
  completedToday: number;
  hourlyRate: number;
  weeklyEarnings: number;
  monthlyEarnings: number;
  pendingPayouts: number;
  completionRate: number;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: Date;
}
