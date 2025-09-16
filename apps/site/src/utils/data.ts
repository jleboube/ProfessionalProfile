import fs from 'fs/promises';
import path from 'path';

export interface ProfileData {
  name: string;
  title: string;
  bio: string;
  location: string;
  email: string;
  githubUsername: string;
  linkedInUsername?: string;
  photo?: string;
}

export interface Skill {
  name: string;
  level: number; // 1-100
  category: 'technical' | 'professional';
}

export interface ResumeEntry {
  type: 'experience' | 'education' | 'awards';
  company: string;
  role: string;
  start: string;
  end: string;
  summary: string;
  // For education
  school?: string;
  degree?: string;
  // For awards
  organization?: string;
  award?: string;
}

export interface Project {
  name: string;
  description: string;
  image: string;
  url: string;
  source: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  date: string;
  excerpt: string;
  content: string;
  tags: string[];
}

export interface SiteData {
  setupCompleted: boolean;
  profile: ProfileData;
  theme: 'light' | 'dark' | 'system';
  colorTheme: 'ocean' | 'forest' | 'sunset' | 'purple';
  resume: ResumeEntry[];
  projects: Project[];
  skills: Skill[];
  blogEnabled: boolean;
  blogPosts: BlogPost[];
}

const DATA_FILE = '/data/data.json';

export async function getSiteData(): Promise<SiteData> {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading data file:', error);
    return {
      setupCompleted: false,
      profile: {
        name: '',
        title: '',
        bio: '',
        location: '',
        email: '',
        githubUsername: ''
      },
      theme: 'system',
      colorTheme: 'ocean',
      resume: [],
      projects: [],
      skills: [],
      blogEnabled: false,
      blogPosts: []
    };
  }
}