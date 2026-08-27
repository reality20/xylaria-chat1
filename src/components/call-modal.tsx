'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff, Video, Mic, MicOff, Camera, CameraOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CallModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'voice' | 'video';
  apiKey?: string;
  apiBaseUrl?: string;
}

const API_BASE_URL = 'https://airalyx.space-z.ai/api/v1';

export function CallModal({ isOpen, onClose, mode, apiKey, apiBaseUrl }: CallModalProps) {
  const [callState, setCallState] = useState<'idle' | 'connecting' | 'connected' | 'ended'>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(mode === 'voice');
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const baseUrl = apiBaseUrl || API_BASE_URL;

  // Initialize local media stream
  const getLocalStream = useCallback(async () => {
    try {
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: mode === 'video' && !isCameraOff ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        } : false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      return stream;
    } catch (err) {
      console.error('Error accessing media devices:', err);
      setError('Failed to access camera/microphone. Please check permissions.');
      throw err;
    }
  }, [mode, isCameraOff]);

  // Start call timer
  useEffect(() => {
    if (callState === 'connected') {
      timerIntervalRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      setCallDuration(0);
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [callState]);

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Initialize WebRTC connection
  const initializePeerConnection = useCallback(async (stream: MediaStream) => {
    const configuration: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };

    const pc = new RTCPeerConnection(configuration);
    peerConnectionRef.current = pc;

    // Add local tracks to peer connection
    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });

    // Handle remote stream
    pc.ontrack = (event) => {
      console.log('Received remote track:', event.track.kind);
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        console.log('ICE candidate generated');
        // Send ICE candidate to server via data channel or signaling
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setCallState('connected');
      } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        setError('Connection lost');
        endCall();
      }
    };

    // Create data channel for signaling
    const dataChannel = pc.createDataChannel('signaling');
    dataChannelRef.current = dataChannel;

    dataChannel.onopen = () => {
      console.log('Data channel opened');
    };

    dataChannel.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('Received signaling message:', message.type);
        
        if (message.type === 'offer' && message.sdp) {
          await pc.setRemoteDescription(new RTCSessionDescription(message));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          
          // Send answer back
          if (dataChannel.readyState === 'open') {
            dataChannel.send(JSON.stringify({ type: 'answer', sdp: answer.sdp }));
          }
        } else if (message.type === 'answer' && message.sdp) {
          await pc.setRemoteDescription(new RTCSessionDescription(message));
        } else if (message.type === 'candidate' && message.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(message.candidate));
        }
      } catch (err) {
        console.error('Error handling signaling message:', err);
      }
    };

    // Create offer
    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: mode === 'video'
    });
    await pc.setLocalDescription(offer);

    // Send offer to server
    try {
      const response = await fetch(`${baseUrl}/calls/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {})
        },
        body: JSON.stringify({
          type: 'offer',
          sdp: offer.sdp,
          mode: mode
        })
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const answerData = await response.json();
      
      if (answerData.sdp) {
        await pc.setRemoteDescription(new RTCSessionDescription(answerData));
      }
    } catch (err) {
      console.error('Error starting call:', err);
      setError('Failed to connect to server. Please try again.');
      endCall();
    }
  }, [mode, apiKey, baseUrl]);

  // Start call
  const startCall = useCallback(async () => {
    setCallState('connecting');
    setError(null);

    try {
      const stream = await getLocalStream();
      await initializePeerConnection(stream);
    } catch (err) {
      setCallState('idle');
    }
  }, [getLocalStream, initializePeerConnection]);

  // End call
  const endCall = useCallback(() => {
    // Stop all tracks
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }

    if (remoteStream) {
      remoteStream.getTracks().forEach(track => track.stop());
      setRemoteStream(null);
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Close data channel
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }

    setCallState('ended');
    
    // Reset after a brief delay
    setTimeout(() => {
      setCallState('idle');
      onClose();
    }, 1000);
  }, [localStream, remoteStream, onClose]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, [localStream]);

  // Toggle camera
  const toggleCamera = useCallback(async () => {
    if (localStream && mode === 'video') {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOff(!videoTrack.enabled);
      }
    }
  }, [localStream, mode]);

  // Auto-start call when modal opens
  useEffect(() => {
    if (isOpen && callState === 'idle') {
      startCall();
    }
  }, [isOpen, callState, startCall]);

  // Cleanup on close
  useEffect(() => {
    if (!isOpen) {
      endCall();
    }
  }, [isOpen, endCall]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={cn(
        "sm:max-w-[600px]",
        mode === 'video' ? "sm:max-w-[800px]" : ""
      )}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'video' ? (
              <Video className="h-5 w-5" />
            ) : (
              <Phone className="h-5 w-5" />
            )}
            {callState === 'connecting' && 'Connecting...'}
            {callState === 'connected' && `${mode === 'video' ? 'Video' : 'Voice'} Call`}
            {callState === 'ended' && 'Call Ended'}
            {callState === 'idle' && 'Starting Call...'}
          </DialogTitle>
        </DialogHeader>

        <div className={cn(
          "relative flex flex-col items-center justify-center",
          mode === 'video' ? "min-h-[400px]" : "min-h-[200px]"
        )}>
          {/* Remote video */}
          {mode === 'video' && (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className={cn(
                "absolute inset-0 h-full w-full object-cover rounded-lg bg-muted",
                callState !== 'connected' && "opacity-50"
              )}
            />
          )}

          {/* Local video (picture-in-picture for video calls) */}
          {mode === 'video' && localStream && (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={cn(
                "absolute top-4 right-4 h-32 w-24 object-cover rounded-lg border-2 border-background shadow-lg z-10",
                isCameraOff && "bg-muted"
              )}
            />
          )}

          {/* Call status */}
          <div className="relative z-20 flex flex-col items-center gap-4">
            {callState === 'connecting' && (
              <>
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
                <p className="text-muted-foreground">Connecting to {mode === 'video' ? 'video' : 'voice'} call...</p>
              </>
            )}

            {callState === 'connected' && (
              <>
                {mode === 'voice' && (
                  <div className="h-32 w-32 rounded-full bg-primary/10 flex items-center justify-center">
                    <Phone className="h-16 w-16 text-primary" />
                  </div>
                )}
                <p className="text-2xl font-semibold">{formatDuration(callDuration)}</p>
                <p className="text-muted-foreground">
                  {isMuted ? 'Microphone muted' : 'In call'}
                </p>
              </>
            )}

            {callState === 'ended' && (
              <p className="text-muted-foreground">Call ended</p>
            )}

            {error && (
              <p className="text-destructive text-sm">{error}</p>
            )}
          </div>
        </div>

        {/* Call controls */}
        {callState === 'connected' && (
          <DialogFooter className="flex items-center justify-center gap-4 sm:gap-6">
            <Button
              variant={isMuted ? "default" : "outline"}
              size="icon"
              onClick={toggleMute}
              className="h-12 w-12 rounded-full"
            >
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>

            {mode === 'video' && (
              <Button
                variant={isCameraOff ? "default" : "outline"}
                size="icon"
                onClick={toggleCamera}
                className="h-12 w-12 rounded-full"
              >
                {isCameraOff ? <CameraOff className="h-5 w-5" /> : <Camera className="h-5 w-5" />}
              </Button>
            )}

            <Button
              variant="destructive"
              size="icon"
              onClick={endCall}
              className="h-12 w-12 rounded-full"
            >
              <PhoneOff className="h-5 w-5" />
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
