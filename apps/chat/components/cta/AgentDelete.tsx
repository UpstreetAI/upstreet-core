'use client';

import React, { ForwardedRef, forwardRef } from 'react';
import { IconButton } from 'ucom';

interface AgentDeleteProps {
  handleClick: () => void;
  loading: boolean;
}

function AgentDelete({ handleClick, loading }: AgentDeleteProps, ref: ForwardedRef<HTMLDivElement>) {
  return (
    <div ref={ref}>
      <IconButton
        onClick={handleClick}
        icon="Trash"
        size="small"
        variant="primary"
        disabled={loading}
    />
    </div>
  );
}

export default forwardRef(AgentDelete);
