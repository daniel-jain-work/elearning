import * as React from 'react';

const imageExtensions: string[] = ['jpeg', 'jpg', 'jpe', 'png', 'gif'];
const videoExtensions: string[] = ['mp4', 'ogg', 'webm'];

function ProjectPreview(props: { url: string; size: number }) {
  const fileExt = props.url.slice(props.url.lastIndexOf('.') + 1).toLowerCase();

  if (imageExtensions.includes(fileExt)) {
    return <img src={props.url} style={{ width: props.size, maxWidth: '100%' }} />;
  }

  if (videoExtensions.includes(fileExt)) {
    return (
      <video
        src={props.url}
        autoPlay
        controls
        style={{ width: props.size, maxWidth: '100%' }}
      />
    );
  }

  return <img src={`https://via.placeholder.com/${props.size}`} />;
}

export default React.memo(ProjectPreview);
