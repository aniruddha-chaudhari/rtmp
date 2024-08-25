import React, { useRef, useState, useEffect } from 'react';
import flv from 'flv.js';

const ViewerComponent = ({ streamKey }) => {
  const videoRef = useRef(null);
  const flvPlayerRef = useRef(null);
  const [error, setError] = useState(null);
  const [isUserInteracted, setIsUserInteracted] = useState(false);

  useEffect(() => {
    if (!flv.isSupported()) {
      setError('FLV is not supported in this browser.');
      return;
    }

    if (!streamKey) {
      setError('No stream key provided.');
      return;
    }

    const loadPlayer = async () => {
      try {
        flvPlayerRef.current = flv.createPlayer({
          type: 'flv',
          url: `http://localhost:8000/live/${streamKey}.flv`
        });
        flvPlayerRef.current.attachMediaElement(videoRef.current);
        await flvPlayerRef.current.load();
        if (isUserInteracted) {
          await flvPlayerRef.current.play();
        }
      } catch (e) {
        console.error('Error loading or playing stream:', e);
        setError('Failed to load or play the stream. Please check if the stream is live.');
      }
    };

    loadPlayer();
  }, [streamKey, isUserInteracted]);

  const handlePlayClick = async () => {
    setIsUserInteracted(true);
    if (flvPlayerRef.current) {
      try {
        await flvPlayerRef.current.play();
      } catch (e) {
        console.error('Error playing stream:', e);
        setError('Failed to play the stream. Please check if the stream is live.');
      }
    }
  };

  return (
    <div>
      {error && <div className="error">{error}</div>}
      <video ref={videoRef} controls style={{ width: '100%' }} />
      {!isUserInteracted && (
        <button onClick={handlePlayClick}>Play Stream</button>
      )}
    </div>
  );
};

export default ViewerComponent;