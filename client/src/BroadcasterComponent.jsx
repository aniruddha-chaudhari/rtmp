import React, { useRef, useState, useEffect } from 'react';

const BroadcasterComponent = () => {
  const videoRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamKey, setStreamKey] = useState('');
  const peerConnectionRef = useRef(null);
  const websocketRef = useRef(null);

  useEffect(() => {
    websocketRef.current = new WebSocket('ws://localhost:3000');

    websocketRef.current.onopen = () => {
      console.log('WebSocket connection established');
    };

    return () => {
      if (websocketRef.current) {
        websocketRef.current.close();
      }
    };
  }, []);

  const startStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      videoRef.current.srcObject = stream;

      peerConnectionRef.current = new RTCPeerConnection();

      stream.getTracks().forEach(track => {
        peerConnectionRef.current.addTrack(track, stream);
      });

      peerConnectionRef.current.onicecandidate = (event) => {
        if (event.candidate) {
          websocketRef.current.send(JSON.stringify({ type: 'ice-candidate', candidate: event.candidate }));
        }
      };

      const offer = await peerConnectionRef.current.createOffer();
      await peerConnectionRef.current.setLocalDescription(offer);

      websocketRef.current.send(JSON.stringify({ type: 'offer', offer }));

      setIsStreaming(true);
    } catch (error) {
      console.error('Error starting stream:', error);
    }
  };

  const stopStream = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    const stream = videoRef.current.srcObject;
    const tracks = stream.getTracks();
    tracks.forEach(track => track.stop());
    videoRef.current.srcObject = null;

    setIsStreaming(false);
  };

  return (
    <div>
      <video ref={videoRef} autoPlay muted />
      <input 
        type="text" 
        value={streamKey} 
        onChange={(e) => setStreamKey(e.target.value)} 
        placeholder="Enter stream key"
      />
      <button onClick={isStreaming ? stopStream : startStream} disabled={!streamKey}>
        {isStreaming ? 'Stop Streaming' : 'Start Streaming'}
      </button>
    </div>
  );
};

export default BroadcasterComponent;