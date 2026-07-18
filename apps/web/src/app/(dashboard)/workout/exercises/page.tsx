'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { exercisesApi } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Search, Loader2 } from 'lucide-react';
import { getMuscleGroupLabel } from '@/lib/utils';

export default function ExercisesPage() {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [muscleGroup, setMuscleGroup] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['exercises', debounced, muscleGroup],
    queryFn: () => exercisesApi.getAll({ search: debounced, muscleGroup, limit: 30 }),
    select: (res: any) => res.data,
    enabled: true,
  });

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-field pl-10"
          placeholder="Cerca esercizio..."
        />
      </div>

      <div className="flex gap-2 flex-wrap">
        {['', 'CHEST', 'BACK', 'SHOULDERS', 'BICEPS', 'TRICEPS', 'QUADS', 'HAMSTRINGS', 'GLUTES'].map(mg => (
          <button
            key={mg}
            onClick={() => setMuscleGroup(mg)}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${muscleGroup === mg ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
          >
            {mg ? getMuscleGroupLabel(mg) : 'Tutti'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <p className="text-muted-foreground">Impossibile caricare i dati, riprova</p>
          <button
            onClick={() => refetch()}
            className="text-sm font-medium text-primary hover:underline"
          >
            Riprova
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data?.exercises?.map((ex: any) => (
            <Card key={ex.id} className="hover:border-primary/20 transition-colors cursor-pointer">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg">💪</span>
                </div>
                <div>
                  <p className="font-semibold text-sm">{ex.name}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {ex.muscleGroups?.slice(0, 2).map((mg: string) => (
                      <span key={mg} className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                        {getMuscleGroupLabel(mg)}
                      </span>
                    ))}
                    <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded capitalize">
                      {ex.difficulty?.toLowerCase()}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
