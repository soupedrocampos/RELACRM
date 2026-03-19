export interface ExtractedInfo {
  zodiacSign?: string;
  interests?: string[];
  phone?: string;
  context?: string;
  rawText?: string;
  language?: string;
}

export interface Contact {
  id: string;
  name: string;
  age: number;
  city: string;
  platform: 'Instagram' | 'Tinder' | 'Bumble' | 'Happn' | 'Inner Circle' | string;
  avatar: string;
  followers: number;
  following: number;
  popularity: 'Alta' | 'Média' | 'Baixa' | string;
  personalityType: 'Extrovertida' | 'Introvertida' | 'Ambiverte' | string;
  vanityIndex: number; // 1-10
  opennessIndex: number; // 1-10
  libidoIndex?: number; // 1-10
  financialExpectationIndex?: number; // 1-10
  jealousyIndex?: number; // 1-10
  accessibilityIndex?: number; // 1-10
  emotionalDependencyIndex?: number; // 1-10
  profileType: 'Influencer' | 'Comum' | 'Reservada' | 'Social' | string;
  keyTraits: string[];
  approachTips: string[];
  redFlags: string[];
  summary: string;
  milestones: {
    phase: {
      kiss: boolean;
      drink: boolean;
      skull: boolean;
    };
    info: {
      whatsapp: boolean;
      map: boolean;
      photo: boolean;
    };
  };
  lastInteractionDays: number;
  bio: string;
  phone?: string;
  prints: string[];
  audioNotes: AudioNote[];
  sexualOpenness?: string;
  behavioralAnalysis?: string;
  photoCount?: number;
  extractedInfo?: ExtractedInfo;
  createdAt?: string;
  lastAnalyzedAt?: string;
}

export interface AudioNote {
  id: string;
  date: string;
  duration: string;
  summary: string;
  audioBlob?: string;
}

export interface City {
  name: string;
  contactsCount: number;
  avatars: string[];
}
