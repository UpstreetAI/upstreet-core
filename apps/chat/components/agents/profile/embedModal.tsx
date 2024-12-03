'use client';

import { useEffect, useState } from 'react';
import { Button, IconButton } from 'ucom';
import { getUserForJwt, makeAnonymousClient } from '@/utils/supabase/supabase-client';
import { getJWT } from '@/lib/jwt';
import { env } from '@/lib/env';
import { useCopyToClipboard } from '@/lib/client/hooks/use-copy-to-clipboard';

export default function EmbedModal({agent, close}: {agent: any, close: () => void}) {
  const [trustedUrls, setTrustedUrls] = useState<string[]>(agent?.embed?.trusted_urls ?? []);
  const [embedCode, setEmbedCode] = useState<string>('');

  const updateTrustedUrls = async (urls: string[]) => {
    const jwt = await getJWT();
    const supabase = makeAnonymousClient(env, jwt);
    const { data, error } = await supabase
      .from('embed_agent')
      .upsert({ asset_id: agent.id, trusted_urls: urls }, { onConflict: 'asset_id' });

    if (error) {
      console.error('Error updating trusted URLs:', error);
    } else {
      console.log('Trusted URLs updated:', data);
    }
  };

  const addUrl = async () => {
    const urlInput = document.getElementById('trusted-url-input') as HTMLInputElement;
    const urlValue = urlInput.value.trim();
    if (urlValue) {
      const updatedUrls = [...trustedUrls, urlValue];
      setTrustedUrls(updatedUrls);
      urlInput.value = '';
      await updateTrustedUrls(updatedUrls);
    }
  };

  const removeUrl = async (url: string) => {
    const updatedUrls = trustedUrls.filter((item) => item !== url);
    setTrustedUrls(updatedUrls);
    await updateTrustedUrls(updatedUrls);
  };

  const generateEmbedCode = () => {
    const defaultWidth = 300;
    const defaultHeight = 400;
    const embedCode = `<iframe allowtransparency="true" src="${window.location.origin}/embed/${agent.id}" width="${defaultWidth}" height="${defaultHeight}" style={{ position: 'fixed', bottom: 0, right: 0, zIndex: 9999, background: 'transparent', border: 0, }}></iframe>`;
    setEmbedCode(embedCode);
  };

  useEffect(() => {
    generateEmbedCode();
  }, []);
  
  const { isCopied, copyToClipboard } = useCopyToClipboard({ timeout: 2000 });
  const handleCopy = () => {
    if (!isCopied) {
      copyToClipboard(embedCode);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-opacity-50 bg-zinc-950 flex justify-center items-center z-50 text-zinc-900"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          close();
        }
      }}
    >
      <div className="bg-[#C8CFD7] rounded-lg w-full max-w-4xl">
        <div className='bg-zinc-900 px-4 py-3 text-xl font-bold text-center text-white relative'>
          Embed Agent
          <div className='absolute right-0 top-0 m-4' style={{ zoom: 0.7 }}>
            <IconButton icon={"Close"} size='small' onClick={close} />
          </div>
        </div>
        <div className="p-6 md:flex gap-4">
          <div className="w-full md:w-1/2 md:pr-4 mb-4 md:mb-0">
            <h2 className="text-xl font-semibold mb-4 relative">
              Agent Embed Code
              <div className='absolute right-0 top-0' style={{ zoom: 0.7 }}>
                <IconButton icon={isCopied ? "Check" : "Copy"} size='small' onClick={handleCopy} />
              </div>
            </h2>
            <textarea value={embedCode} className="w-full h-64 p-4 border-[2px] border-[#475461] bg-[#E4E8EF]" readOnly />
          </div>
          <div className="w-full md:w-1/2 md:border-l border-zinc-400 md:pl-8">
            <h2 className="text-xl font-semibold mb-4">Settings</h2>
            <div className="mb-6">
              <label className="block font-medium mb-2">Trusted URLs</label>
              <ul className="mb-4">
                {trustedUrls.map((url, index) => (
                  <li key={index} className="flex justify-between items-center mb-2">
                    <span>{url}</span>
                    <button className="text-red-500" onClick={() => removeUrl(url)}>Remove</button>
                  </li>
                ))}
              </ul>
              <input 
                type="text" 
                id="trusted-url-input" 
                className='w-full px-4 py-2 bg-[#E4E8EF] border-2 border-[#475461] text-gray-900 text-sm mb-2'
                placeholder="Enter a trusted URL"
              />
              <Button onClick={addUrl} className='w-full'>
                Add URL
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}