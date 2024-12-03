import React from 'react';
import { Agents } from '@/components/agents';
import Footer from '@/components/ui/Footer';
import Header from '@/components/ui/Header';

export default function AgentsPage() {
  return (
    <div className='w-full'>
      <Header />
      <div className="relative w-full mx-auto max-w-[1400px] px-4 py-8">
        <Agents loadmore={true} search range={12} row={false} />
      </div>
      <Footer />
    </div>
  );
}
