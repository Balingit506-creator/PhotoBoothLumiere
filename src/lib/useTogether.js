/* Lumière Booth — "Shoot together": a two-person booth over WebRTC (PeerJS). */
import { useCallback, useEffect, useRef, useState } from 'react';
import { TURN } from '../together.config.js';

const PREFIX = 'lumiere-booth-';
const CONNECT_TIMEOUT = 25000;

export function roomFromHash() {
  const m = location.hash.match(/room=([a-z0-9]+)/i);
  return m ? m[1] : null;
}

const newRoomId = () => Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => (b % 36).toString(36)).join('');

// PeerJS is loaded only when someone actually uses Shoot together.
async function makePeer(id) {
  const { Peer } = await import('peerjs');
  const opts = TURN.length ? { config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, ...TURN] } } : {};
  return id ? new Peer(PREFIX + id, opts) : new Peer(opts);
}

function errorText(e) {
  if (e.type === 'peer-unavailable') return 'This invite has expired, or your friend closed their booth. Ask them for a new link.';
  if (e.type === 'browser-incompatible') return 'This browser cannot make video connections. Try Chrome, Safari or Firefox.';
  if (e.type === 'network' || e.type === 'server-error' || e.type === 'socket-error') return 'Could not reach the connection service. Check your internet and try again.';
  return 'Something went wrong while connecting. Please try again.';
}

/**
 * status: 'off' | 'starting' | 'waiting' (host, link ready) | 'joining' | 'connected' | 'error'
 * Messages arrive through `onMessage`, plus { t: 'open' } and { t: 'left' } for the friend arriving and leaving.
 */
export function useTogether(onMessage) {
  const [status, setStatusState] = useState('off');
  const [role, setRole] = useState(null);
  const [link, setLink] = useState('');
  const [error, setError] = useState('');
  const [remoteStream, setRemoteStream] = useState(null);

  const peerRef = useRef(null);
  const connRef = useRef(null);
  const callRef = useRef(null);
  const friendRef = useRef(null);
  const streamRef = useRef(null);
  const roleRef = useRef(null);
  const statusRef = useRef('off');
  const handler = useRef(onMessage);
  handler.current = onMessage;

  const setStatus = (s) => { statusRef.current = s; setStatusState(s); };
  const fail = (msg) => { setError(msg); setStatus('error'); };

  const dropFriend = useCallback(() => {
    const conn = connRef.current, call = callRef.current;
    connRef.current = callRef.current = friendRef.current = null;
    if (conn) conn.close();
    if (call) call.close();
    setRemoteStream(null);
  }, []);

  // The host accepts one friend: the first peer to arrive.
  const isFriend = (peerId) => {
    if (!friendRef.current) friendRef.current = peerId;
    return friendRef.current === peerId;
  };

  function watchCall(call) {
    callRef.current = call;
    call.on('stream', (s) => setRemoteStream(s));
    call.on('close', () => { if (callRef.current === call) setRemoteStream(null); });
    call.on('error', () => {});
  }

  function watchConn(conn) {
    connRef.current = conn;
    conn.on('open', () => { setStatus('connected'); setError(''); handler.current({ t: 'open' }); });
    conn.on('data', (m) => handler.current(m));
    conn.on('close', () => {
      if (connRef.current !== conn) return;
      dropFriend();
      handler.current({ t: 'left' });
      if (roleRef.current === 'host') setStatus('waiting');
      else fail('Your friend left the booth.');
    });
    conn.on('error', () => {});
  }

  const reset = useCallback(() => {
    dropFriend();
    if (peerRef.current) peerRef.current.destroy();
    peerRef.current = null;
  }, [dropFriend]);

  const host = useCallback(async (stream) => {
    reset();
    streamRef.current = stream; roleRef.current = 'host';
    setRole('host'); setError(''); setStatus('starting');
    const id = newRoomId();
    let peer;
    try { peer = await makePeer(id); } catch (e) { fail(errorText({ type: 'network' })); return; }
    peerRef.current = peer;
    peer.on('open', () => {
      setLink(`${location.origin}${location.pathname}#room=${id}`);
      setStatus('waiting');
    });
    peer.on('connection', (conn) => {
      if (!isFriend(conn.peer) || connRef.current) {
        conn.on('open', () => { conn.send({ t: 'full' }); setTimeout(() => conn.close(), 800); });
        return;
      }
      watchConn(conn);
    });
    peer.on('call', (call) => {
      if (!isFriend(call.peer) || callRef.current) { call.close(); return; }
      call.answer(streamRef.current);
      watchCall(call);
    });
    // Losing the signalling server does not drop an existing call; reconnect for the next guest.
    peer.on('disconnected', () => { if (!peer.destroyed) peer.reconnect(); });
    peer.on('error', (e) => {
      if (e.type === 'peer-unavailable') return;
      if (statusRef.current !== 'connected') fail(errorText(e));
    });
  }, [reset]);

  const join = useCallback(async (room, stream) => {
    reset();
    streamRef.current = stream; roleRef.current = 'guest';
    setRole('guest'); setError(''); setStatus('joining');
    let peer;
    try { peer = await makePeer(); } catch (e) { fail(errorText({ type: 'network' })); return; }
    peerRef.current = peer;
    peer.on('open', () => {
      watchConn(peer.connect(PREFIX + room, { reliable: true }));
      watchCall(peer.call(PREFIX + room, stream));
    });
    peer.on('error', (e) => { if (statusRef.current !== 'connected') fail(errorText(e)); });
    setTimeout(() => {
      if (peerRef.current === peer && statusRef.current === 'joining') {
        reset();
        fail('Could not connect to your friend. One of your networks may block video connections; try another Wi-Fi or mobile data.');
      }
    }, CONNECT_TIMEOUT);
  }, [reset]);

  const leave = useCallback(() => {
    reset();
    roleRef.current = null;
    setRole(null); setLink(''); setError(''); setStatus('off');
  }, [reset]);

  const send = useCallback((m) => {
    const conn = connRef.current;
    if (conn && conn.open) conn.send(m);
  }, []);

  // After a camera restart or flip, swap the new track into the live call.
  const updateStream = useCallback((stream) => {
    streamRef.current = stream;
    const pc = callRef.current && callRef.current.peerConnection;
    const track = stream.getVideoTracks()[0];
    if (!pc || !track) return;
    pc.getSenders().filter((s) => !s.track || s.track.kind === 'video').forEach((s) => s.replaceTrack(track).catch(() => {}));
  }, []);

  useEffect(() => () => { if (peerRef.current) peerRef.current.destroy(); }, []);

  return { status, role, link, error, remoteStream, connected: status === 'connected', host, join, leave, send, updateStream };
}
