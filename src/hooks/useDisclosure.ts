import { useState, useCallback, useEffect } from 'react';
import type { Disclosure, DisclosureContent, DisclosureStatus, ChapterCompleteness } from '@/types';
import { disclosureApi } from '@/services/api';
import { DISCLOSURE_CHAPTERS } from '@/constants';

interface UseDisclosureReturn {
  disclosures: Disclosure[];
  currentDisclosure: Disclosure | null;
  stats: {
    total: number;
    draft: number;
    processing: number;
    review: number;
    approved: number;
  };
  loading: boolean;
  error: string | null;
  loadDisclosures: () => Promise<void>;
  loadDisclosureById: (id: string) => Promise<void>;
  createDisclosure: (type: Disclosure['type'], authorId: string, authorName: string) => Promise<Disclosure>;
  updateDisclosure: (id: string, updates: Partial<Disclosure>) => Promise<void>;
  updateContent: (id: string, content: Partial<DisclosureContent>) => Promise<void>;
  deleteDisclosure: (id: string) => Promise<void>;
  changeStatus: (id: string, status: DisclosureStatus) => Promise<void>;
  calculateCompleteness: (disclosure: Disclosure) => ChapterCompleteness[];
  calculateQualityScore: (disclosure: Disclosure) => number;
}

export function useDisclosure(): UseDisclosureReturn {
  const [disclosures, setDisclosures] = useState<Disclosure[]>([]);
  const [currentDisclosure, setCurrentDisclosure] = useState<Disclosure | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    processing: 0,
    review: 0,
    approved: 0
  });

  // 加载交底书列表
  const loadDisclosures = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await disclosureApi.getList();
      const list = response.data.list || [];
      setDisclosures(list);
      
      // 计算统计
      const newStats = {
        total: list.length,
        draft: list.filter((d: Disclosure) => d.status === 'draft').length,
        processing: list.filter((d: Disclosure) => d.status === 'processing').length,
        review: list.filter((d: Disclosure) => d.status === 'review').length,
        approved: list.filter((d: Disclosure) => d.status === 'approved').length
      };
      setStats(newStats);
    } catch (err: any) {
      setError(err.message || '加载失败');
      console.error('加载交底书列表失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 根据ID加载单个交底书
  const loadDisclosureById = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await disclosureApi.getById(id);
      setCurrentDisclosure(response.data);
    } catch (err: any) {
      setError(err.message || '加载失败');
      console.error('加载交底书详情失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 创建新交底书
  const createDisclosure = useCallback(async (type: Disclosure['type'], authorId: string, authorName: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await disclosureApi.create({
        type,
        content: {
          title: '',
          technicalField: '',
          backgroundArt: '',
          inventionContent: '',
          technicalSolution: '',
          beneficialEffects: '',
          figureDescription: '',
          implementation: '',
          claimsSuggestion: ''
        }
      });
      const created = response.data;
      setDisclosures(prev => [created, ...prev]);
      setCurrentDisclosure(created);
      return created;
    } catch (err: any) {
      setError(err.message || '创建失败');
      console.error('创建交底书失败:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // 更新交底书
  const updateDisclosure = useCallback(async (id: string, updates: Partial<Disclosure>) => {
    setLoading(true);
    setError(null);
    try {
      const response = await disclosureApi.update(id, updates);
      const updated = response.data;
      setDisclosures(prev => 
        prev.map(d => d.id === id ? updated : d)
      );
      if (currentDisclosure?.id === id) {
        setCurrentDisclosure(updated);
      }
    } catch (err: any) {
      setError(err.message || '更新失败');
      console.error('更新交底书失败:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentDisclosure]);

  // 更新内容
  const updateContent = useCallback(async (id: string, content: Partial<DisclosureContent>) => {
    setLoading(true);
    setError(null);
    try {
      const disclosure = disclosures.find(d => d.id === id);
      if (!disclosure) return;

      const updatedContent = { ...disclosure.content, ...content };
      const response = await disclosureApi.update(id, { content: updatedContent });
      const updated = response.data;
      
      setDisclosures(prev => 
        prev.map(d => d.id === id ? updated : d)
      );
      if (currentDisclosure?.id === id) {
        setCurrentDisclosure(updated);
      }
    } catch (err: any) {
      setError(err.message || '更新内容失败');
      console.error('更新内容失败:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [disclosures, currentDisclosure]);

  // 删除交底书
  const deleteDisclosure = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await disclosureApi.delete(id);
      setDisclosures(prev => prev.filter(d => d.id !== id));
      if (currentDisclosure?.id === id) {
        setCurrentDisclosure(null);
      }
    } catch (err: any) {
      setError(err.message || '删除失败');
      console.error('删除交底书失败:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentDisclosure]);

  // 修改状态
  const changeStatus = useCallback(async (id: string, status: DisclosureStatus) => {
    await updateDisclosure(id, { status });
  }, [updateDisclosure]);

  // 计算章节完整性
  const calculateCompleteness = useCallback((disclosure: Disclosure): ChapterCompleteness[] => {
    return DISCLOSURE_CHAPTERS.map(chapter => {
      const content = disclosure.content[chapter.key as keyof DisclosureContent];
      const filled = !!content && content.length >= chapter.minLength;
      let quality = 0;
      
      if (filled) {
        quality = Math.min(100, (content.length / chapter.minLength) * 50 + 50);
      }
      
      const suggestions: string[] = [];
      if (!content) {
        suggestions.push(`${chapter.label}为必填项，请填写内容`);
      } else if (content.length < chapter.minLength) {
        suggestions.push(`${chapter.label}内容过短，建议至少${chapter.minLength}字`);
      }
      
      return {
        chapter: chapter.key,
        filled,
        quality,
        suggestions
      };
    });
  }, []);

  // 计算质量评分
  const calculateQualityScore = useCallback((disclosure: Disclosure): number => {
    const completeness = calculateCompleteness(disclosure);
    const totalScore = completeness.reduce((sum, item) => sum + item.quality, 0);
    return Math.round(totalScore / completeness.length);
  }, [calculateCompleteness]);

  return {
    disclosures,
    currentDisclosure,
    stats,
    loading,
    error,
    loadDisclosures,
    loadDisclosureById,
    createDisclosure,
    updateDisclosure,
    updateContent,
    deleteDisclosure,
    changeStatus,
    calculateCompleteness,
    calculateQualityScore
  };
}
