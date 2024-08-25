import NodeMediaServer from 'node-media-server';
import express from 'express';
import http from 'http';
import WebSocket from 'ws';
import ffmpeg from 'fluent-ffmpeg';

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const rtmpConfig = {
  rtmp: {
    port: 1935,
    chunk_size: 60000,
    gop_cache: true,
    ping: 30,
    ping_timeout: 60
  },
  http: {
    port: 8000,
    allow_origin: '*'
  }
};

const nms = new NodeMediaServer(rtmpConfig);
nms.run();

const streams = new Map();

wss.on('connection', (ws) => {
  console.log('New WebSocket connection');

  ws.on('message', (message) => {
    const data = JSON.parse(message);

    if (data.type === 'broadcast') {
      handleBroadcast(ws, data);
    } else if (data.type === 'view') {
      handleView(ws, data);
    }
  });
});

function handleBroadcast(ws, data) {
  const streamKey = data.streamKey;
  const webrtcStreamUrl = data.streamUrl;
  const rtmpUrl = `rtmp://localhost:1935/live/${streamKey}`;

  ffmpeg(webrtcStreamUrl)
    .inputFormat('webrtc')
    .on('start', () => {
      console.log('FFmpeg started');
      streams.set(streamKey, { rtmpUrl, viewers: new Set() });
    })
    .on('error', (err) => {
      console.error('FFmpeg error:', err);
    })
    .on('end', () => {
      console.log('FFmpeg ended');
      streams.delete(streamKey);
    })
    .outputOptions([
      '-c:v libx264',
      '-preset ultrafast',
      '-tune zerolatency',
      '-c:a aac',
      '-ar 44100',
      '-b:a 128k',
      '-f flv',
    ])
    .output(rtmpUrl)
    .run();
}

function handleView(ws, data) {
  const streamKey = data.streamKey;
  const stream = streams.get(streamKey);

  if (stream) {
    stream.viewers.add(ws);
    ws.send(JSON.stringify({ type: 'rtmpUrl', url: stream.rtmpUrl }));
    
    ws.on('close', () => {
      stream.viewers.delete(ws);
    });
  } else {
    ws.send(JSON.stringify({ type: 'error', message: 'Stream not found' }));
  }
}

server.listen(3000, () => {
  console.log('WebSocket server running on ws://localhost:3000');
  console.log('RTMP server running on rtmp://localhost:1935');
  console.log('HTTP server running on http://localhost:8000');
});