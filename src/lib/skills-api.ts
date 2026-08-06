import api from './api';
import type { Skill, SkillListResponse, SkillPayload } from '../types/skill';

export const skillsApi = {
  /** 全局 Skill 列表（只返回启用中的） */
  list: async () => {
    const { data } = await api.get<SkillListResponse>('/skills');
    return data;
  },

  create: async (payload: SkillPayload) => {
    const { data } = await api.post<Skill>('/skills', payload);
    return data;
  },

  /** 更新（仅创建者或管理员） */
  update: async (id: string, payload: Partial<SkillPayload>) => {
    const { data } = await api.patch<Skill>(`/skills/${id}`, payload);
    return data;
  },

  remove: async (id: string) => {
    await api.delete(`/skills/${id}`);
  },
};

export default skillsApi;
