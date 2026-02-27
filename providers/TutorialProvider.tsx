import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';

const TUTORIAL_KEY = '@ecoroute_tutorial_seen';

export type TutorialScreen = 'route' | 'calendar' | 'locations' | 'materials';

export const [TutorialProvider, useTutorial] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [seenScreens, setSeenScreens] = useState<Set<TutorialScreen>>(new Set());

  const seenQuery = useQuery({
    queryKey: ['tutorial_seen'],
    queryFn: async (): Promise<TutorialScreen[]> => {
      try {
        const stored = await AsyncStorage.getItem(TUTORIAL_KEY);
        console.log('[TutorialProvider] Loaded seen screens:', stored);
        return stored ? (JSON.parse(stored) as TutorialScreen[]) : [];
      } catch (e) {
        console.log('[TutorialProvider] Error loading tutorial state:', e);
        return [];
      }
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (screens: TutorialScreen[]) => {
      await AsyncStorage.setItem(TUTORIAL_KEY, JSON.stringify(screens));
      console.log('[TutorialProvider] Saved seen screens:', screens);
      return screens;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tutorial_seen'] }),
  });

  useEffect(() => {
    if (seenQuery.data) {
      setSeenScreens(new Set(seenQuery.data));
    }
  }, [seenQuery.data]);

  const markSeen = useCallback((screen: TutorialScreen) => {
    setSeenScreens(prev => {
      const next = new Set(prev);
      next.add(screen);
      saveMutation.mutate(Array.from(next));
      return next;
    });
  }, []);

  const hasSeen = useCallback((screen: TutorialScreen): boolean => {
    return seenScreens.has(screen);
  }, [seenScreens]);

  const resetTutorials = useCallback(() => {
    setSeenScreens(new Set());
    saveMutation.mutate([]);
  }, []);

  const isLoaded = !seenQuery.isLoading;

  return { hasSeen, markSeen, resetTutorials, isLoaded };
});
