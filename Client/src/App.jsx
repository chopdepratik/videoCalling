import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

const socket = io("https://videocalling-sqzh.onrender.com");

const VideoCall = () => {
  const localVideo = useRef();
  const remoteVideo = useRef();

  const [remoteSocketId, setRemoteSocketId] = useState(null);
  const pc = useRef(null);

  useEffect(() => {
    // 1. Ask camera & mic permission
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
      localVideo.current.srcObject = stream;

      pc.current = new RTCPeerConnection();

      // Add local stream to connection
      stream.getTracks().forEach(track => {
        pc.current.addTrack(track, stream);
      });

      // Handle remote stream
      pc.current.ontrack = (event) => {
        remoteVideo.current.srcObject = event.streams[0];
      };

      // Send ICE candidate to other user
      pc.current.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("send-ice-candidate", {
            candidate: event.candidate,
            to: remoteSocketId
          });
        }
      };
    });

    // 2. Join and listen for other users
    socket.emit("join");

    socket.on("user-joined", (id) => {
      setRemoteSocketId(id);
    });

    socket.on("receive-offer", async ({ offer, from }) => {
      setRemoteSocketId(from);

      await pc.current.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.current.createAnswer();
      await pc.current.setLocalDescription(answer);

      socket.emit("send-answer", { answer, to: from });
    });

    socket.on("receive-answer", async ({ answer }) => {
      await pc.current.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on("receive-ice-candidate", ({ candidate }) => {
      pc.current.addIceCandidate(new RTCIceCandidate(candidate));
    });
  }, []);

  // 3. Create Offer
  const callUser = async () => {
    const offer = await pc.current.createOffer();
    await pc.current.setLocalDescription(offer);

    socket.emit("send-offer", {
      offer,
      to: remoteSocketId,
    });
  };

  return (
    <div style={{ display: 'flex', gap: '1rem' }}>
      <div>
        <h3>You</h3>
        <video ref={localVideo} autoPlay muted width="300" />
      </div>
      <div>
        <h3>Friend</h3>
        <video ref={remoteVideo} autoPlay width="300" />
      </div>
      <div>
        <button onClick={callUser}>Start Call</button>
      </div>
    </div>
  );
};

export default VideoCall;
