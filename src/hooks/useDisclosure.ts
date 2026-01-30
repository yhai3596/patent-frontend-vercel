import { useState, useCallback } from 'react';
import type { Disclosure, DisclosureContent, DisclosureStatus, ChapterCompleteness } from '@/types';
import { disclosureStorage } from '@/utils/storage';
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
  loadDisclosures: (authorId?: string) => void;
  loadDisclosureById: (id: string) => void;
  createDisclosure: (type: Disclosure['type'], authorId: string, authorName: string) => Disclosure;
  updateDisclosure: (id: string, updates: Partial<Disclosure>) => void;
  updateContent: (id: string, content: Partial<DisclosureContent>) => void;
  deleteDisclosure: (id: string) => void;
  changeStatus: (id: string, status: DisclosureStatus) => void;
  calculateCompleteness: (disclosure: Disclosure) => ChapterCompleteness[];
  calculateQualityScore: (disclosure: Disclosure) => number;
}

export function useDisclosure(): UseDisclosureReturn {
  const [disclosures, setDisclosures] = useState<Disclosure[]>([]);
  const [currentDisclosure, setCurrentDisclosure] = useState<Disclosure | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    processing: 0,
    review: 0,
    approved: 0
  });

  // 加载交底书列表
  const loadDisclosures = useCallback((authorId?: string) => {
    const data = authorId 
      ? disclosureStorage.getByAuthor(authorId)
      : disclosureStorage.getAll();
    setDisclosures(data);
    setStats(disclosureStorage.getStats(authorId));
  }, []);

  // 根据ID加载单个交底书
  const loadDisclosureById = useCallback((id: string) => {
    const disclosure = disclosureStorage.getById(id);
    setCurrentDisclosure(disclosure || null);
  }, []);

  // 创建新交底书
  const createDisclosure = useCallback((type: Disclosure['type'], authorId: string, authorName: string) => {
    const newDisclosure: Omit<Disclosure, 'id' | 'createdAt' | 'updatedAt'> = {
      type,
      status: 'draft',
      authorId,
      authorName,
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
      },
      attachments: [],
      qualityScore: 0,
      completeness: []
    };
    
    const created = disclosureStorage.create(newDisclosure);
    setDisclosures(prev => [created, ...prev]);
    setCurrentDisclosure(created);
    return created;
  }, []);

  // 更新交底书
  const updateDisclosure = useCallback((id: string, updates: Partial<Disclosure>) => {
    const updated = disclosureStorage.update(id, updates);
    if (updated) {
      setDisclosures(prev => 
        prev.map(d => d.id === id ? updated : d)
      );
      if (currentDisclosure?.id === id) {
        setCurrentDisclosure(updated);
      }
    }
  }, [currentDisclosure]);

  // 更新内容
  const updateContent = useCallback((id: string, content: Partial<DisclosureContent>) => {
    const disclosure = disclosureStorage.getById(id);
    if (!disclosure) return;

    const updatedContent = { ...disclosure.content, ...content };
    const updated = disclosureStorage.update(id, { content: updatedContent });
    
    if (updated) {
      setDisclosures(prev => 
        prev.map(d => d.id === id ? updated : d)
      );
      if (currentDisclosure?.id === id) {
        setCurrentDisclosure(updated);
      }
    }
  }, [currentDisclosure]);

  // 删除交底书
  const deleteDisclosure = useCallback((id: string) => {
    const success = disclosureStorage.delete(id);
    if (success) {
      setDisclosures(prev => prev.filter(d => d.id !== id));
      if (currentDisclosure?.id === id) {
        setCurrentDisclosure(null);
      }
    }
  }, [currentDisclosure]);

  // 修改状态
  const changeStatus = useCallback((id: string, status: DisclosureStatus) => {
    updateDisclosure(id, { status });
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
