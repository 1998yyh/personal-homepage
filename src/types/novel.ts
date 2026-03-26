export interface Novel {
  id: number;
  title: string;
  author: string;
  description: string;
  coverUrl: string;
  wordCount: number;
  chapterCount: number;
  status: number; // 0-连载中, 1-已完结
  createdAt: string;
  updatedAt: string;
}

export interface Chapter {
  id: number;
  novelId: number;
  title: string;
  content: string;
  wordCount: number;
  chapterOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface NovelListResponse {
  data: Novel[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ChapterListResponse {
  data: Chapter[];
  total: number;
  novelId: number;
}