export function generateIframe(agentId, framework) {
  
  const iframeAttributes = {
    src: "http://localhost:3000/embed/6b9b0174-aa31-4644-908a-fac17446528f",
    width: "300",
    height: "400",
    style: {
      position: "fixed",
      bottom: "0",
      right: "0",
      zIndex: "9999",
      background: "transparent",
      border: "none",
    },
  };

  switch (framework.toLowerCase()) {
    case "html":
      return `<iframe
  src="${iframeAttributes.src}"
  width="${iframeAttributes.width}"
  height="${iframeAttributes.height}"
  style="${Object.entries(iframeAttributes.style)
    .map(([key, value]) => `${key}: ${value};`)
    .join(" ")}"
></iframe>
      `;

    case "react":
      return `function IframeComponent() {
  return (
    <iframe
      src="${iframeAttributes.src}"
      width="${iframeAttributes.width}"
      height="${iframeAttributes.height}"
      style={{
        position: '${iframeAttributes.style.position}',
        bottom: '${iframeAttributes.style.bottom}',
        right: '${iframeAttributes.style.right}',
        zIndex: '${iframeAttributes.style.zIndex}',
        background: '${iframeAttributes.style.background}',
        border: '${iframeAttributes.style.border}',
      }}
    />
  );
}
export default IframeComponent;
      `;

    case "angular":
      return `<iframe
  src="${iframeAttributes.src}"
  width="${iframeAttributes.width}"
  height="${iframeAttributes.height}"
  style="${Object.entries(iframeAttributes.style)
    .map(([key, value]) => `${key}: ${value};`)
    .join(" ")}"
></iframe>
      `;

    case "vue":
      return `<template>
  <iframe
    src="${iframeAttributes.src}"
    :style="{
      position: '${iframeAttributes.style.position}',
      bottom: '${iframeAttributes.style.bottom}',
      right: '${iframeAttributes.style.right}',
      zIndex: '${iframeAttributes.style.zIndex}',
      background: '${iframeAttributes.style.background}',
      border: '${iframeAttributes.style.border}',
    }"
    width="${iframeAttributes.width}"
    height="${iframeAttributes.height}"
  ></iframe>
</template>
      `;

    case "svelte":
      return `<script>
  let iframeSrc = "${iframeAttributes.src}";
</script>

<iframe
  src={iframeSrc}
  style="${Object.entries(iframeAttributes.style)
    .map(([key, value]) => `${key}: ${value};`)
    .join(" ")}"
  width="${iframeAttributes.width}"
  height="${iframeAttributes.height}"
></iframe>
      `;

    case "php":
      return `<?php
echo '<iframe
  src="${iframeAttributes.src}"
  width="${iframeAttributes.width}"
  height="${iframeAttributes.height}"
  style="${Object.entries(iframeAttributes.style)
    .map(([key, value]) => `${key}: ${value};`)
    .join(" ")}"
></iframe>';
?>
      `;

    case "react native":
      return `import React from 'react';
import { WebView } from 'react-native-webview';

const IframeComponent = () => {
  return (
    <WebView
      source={{ uri: '${iframeAttributes.src}' }}
      style={{
        position: '${iframeAttributes.style.position}',
        bottom: '${iframeAttributes.style.bottom}',
        right: '${iframeAttributes.style.right}',
        zIndex: ${iframeAttributes.style.zIndex},
        backgroundColor: '${iframeAttributes.style.background}',
        border: '${iframeAttributes.style.border}',
        width: ${iframeAttributes.width},
        height: ${iframeAttributes.height},
      }}
    />
  );
};
export default IframeComponent;
      `;

    default:
      return "Framework not supported!";
  }
}
