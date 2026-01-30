export interface UserPreferences {
  // Writing preferences
  defaultCitationStyle?: 'APA' | 'MLA' | 'CHICAGO' | 'HARVARD';
  defaultWritingStyle?: 'ACADEMIC' | 'PROFESSIONAL' | 'CASUAL';
  defaultAcademicLevel?: 'HIGH_SCHOOL' | 'UNDERGRADUATE' | 'GRADUATE' | 'DOCTORAL';
  autoApproveChapters?: boolean;

  // Appearance preferences
  theme?: 'light' | 'dark' | 'system';
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  preferences: UserPreferences | null;
  created_at: string;
  updated_at: string;
}
