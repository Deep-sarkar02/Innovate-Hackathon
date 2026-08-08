import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
  useRoomContext,
  useConnectionState,
} from '@livekit/components-react';
import { ConnectionState } from 'livekit-client';
import { useEffect, useRef } from 'react';

function AudioPublisher({ onConnected, onDisconnected }) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const connectionState = useConnectionState();
  const connectedRef = useRef(false);
  const onConnectedRef = useRef(onConnected);
  const onDisconnectedRef = useRef(onDisconnected);

  useEffect(() => {
    onConnectedRef.current = onConnected;
    onDisconnectedRef.current = onDisconnected;
  }, [onConnected, onDisconnected]);

  useEffect(() => {
    if (connectionState === ConnectionState.Connected && !connectedRef.current) {
      connectedRef.current = true;
      localParticipant.setMicrophoneEnabled(true).catch((err) => {
        console.warn('[livekit] Microphone unavailable:', err?.message ?? err);
      });
      onConnectedRef.current?.();
    }
    if (connectionState === ConnectionState.Disconnected && connectedRef.current) {
      connectedRef.current = false;
      onDisconnectedRef.current?.();
    }
  }, [connectionState, localParticipant]);

  useEffect(() => {
    if (!room) return undefined;
    const handleParticipantConnected = () => {};
    room.on('participantConnected', handleParticipantConnected);
    return () => room.off('participantConnected', handleParticipantConnected);
  }, [room]);

  return <RoomAudioRenderer />;
}

export default function MeetingRoom({
  token,
  serverUrl,
  onConnected,
  onDisconnected,
  onError,
  children,
}) {
  if (!token || !serverUrl) {
    return (
      <div className="text-center py-4 text-amber-400 text-sm">
        LiveKit not configured. Running in demo mode without audio.
      </div>
    );
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect={true}
      audio={true}
      video={false}
      onError={onError}
      className="lk-room-container"
    >
      <AudioPublisher onConnected={onConnected} onDisconnected={onDisconnected} />
      {children}
    </LiveKitRoom>
  );
}

export function useLiveKitMute() {
  const { localParticipant } = useLocalParticipant();
  const isMuted = !localParticipant.isMicrophoneEnabled;

  function toggleMute() {
    localParticipant.setMicrophoneEnabled(isMuted).catch((err) => {
      console.warn('[livekit] Microphone toggle failed:', err?.message ?? err);
    });
  }

  return { isMuted, toggleMute };
}
