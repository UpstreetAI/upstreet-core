'use client';

import ReactMarkdown from 'react-markdown';
// eslint-disable-next-line sort-imports
import { useEffect, useState } from 'react';

export default function Terms() {

  const [md, setMd] = useState('');

  async function getMD(dir: string) {
    return await fetch(dir).then((res) => res.text());
  }

  useEffect(() => {
    void getMD('/md/terms.md').then((res) => {
      setMd(res);
    });
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-6 pt-16 pb-16 markdown">
      <ReactMarkdown>{md}</ReactMarkdown>
    </div>
  );
}
