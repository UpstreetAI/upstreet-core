'use client';

import { Icon } from 'ucom';
import { useSupabase } from '@/lib/hooks/use-supabase';
import { useEffect, useState } from 'react';

export interface AccountButtonProps {
  user: any
}
export function Credits({ user }: AccountButtonProps) {
  const { supabase } = useSupabase();

  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {

    const { data, error } = await supabase
      .from('credits')
      .select("*")
      .eq('agent_id', user.id)
      .limit(1)

    if (!error) {
      const credits = (data?.[0] as any | null)?.credits ?? 0;
      setCredits(credits);
      setLoading(false);
    } else {
      console.error(error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (supabase) fetchData();
  }, [supabase]);

  return (
    <div className='mr-2 md:mr-6 flex items-center font-bold text-2xl'>
      <Icon icon='Credits' className="size-8" /> {loading ? "loading..." : Math.round(credits)}
    </div>
  )
}
