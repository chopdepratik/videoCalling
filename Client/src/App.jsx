import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

// Point at your Render backend ngrok or Render URL:
const socket = io("https://videocalling-sqzh.onrender.com");

export default function VideoCall() {
  const localVideo = useRef();
  const remoteVideo = useRef();
  const pc = useRef();
  
  const [remoteSocketId, setRemoteSocketId] = useState(null);
  const remoteIdRef = useRef(null);
  // keep ref in sync
  useEffect(() => { remoteIdRef.current = remoteSocketId }, [remoteSocketId]);

  // 1) Media + PeerConnection + Handlers
  useEffect(() => {
    // ask for camera/mic
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        localVideo.current.srcObject = stream;

        // create WebRTC connection
        pc.current = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
        });

        // send our tracks
        stream.getTracks().forEach(track => {
          pc.current.addTrack(track, stream);
        });

        // receive theirs
        pc.current.ontrack = (event) => {
          remoteVideo.current.srcObject = event.streams[0];
        };

        // ICE candidate -> send to other peer
        pc.current.onicecandidate = (event) => {
          if (event.candidate && remoteIdRef.current) {
            socket.emit("send-ice-candidate", {
              candidate: event.candidate,
              to: remoteIdRef.current
            });
          }
        };
      })
      .catch(err => {
        console.error("getUserMedia error:", err);
        alert("Please allow camera & microphone access!");
      });

    // 2) Signaling: exchange IDs / offers / answers / ICE
    socket.emit("join");

    // get list of all other users
    socket.on("all-users", (users) => {
      if (users.length > 0) {
        setRemoteSocketId(users[0]);
      }
    });

    socket.on("receive-offer", async ({ offer, from }) => {
      setRemoteSocketId(from);
      await pc.current.setRemoteDescription(offer);
      const answer = await pc.current.createAnswer();
      await pc.current.setLocalDescription(answer);
      socket.emit("send-answer", { answer, to: from });
    });

    socket.on("receive-answer", async ({ answer }) => {
      await pc.current.setRemoteDescription(answer);
    });

    socket.on("receive-ice-candidate", ({ candidate }) => {
      pc.current.addIceCandidate(candidate);
    });

    // cleanup on unmount
    return () => socket.off();
  }, []);

  // 3) Caller: create + send offer
  const callUser = async () => {
    if (!remoteSocketId) return alert("Waiting for someone to join...");
    const offer = await pc.current.createOffer();
    await pc.current.setLocalDescription(offer);
    socket.emit("send-offer", { offer, to: remoteSocketId });
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: window.innerWidth < 600 ? "column" : "row",
      gap: "1rem",
      alignItems: "center",
      justifyContent: "center",
      padding: "1rem"
    }}>
      <div>
        <h3>You</h3>
        <video
          ref={localVideo}
          autoPlay
          muted
          playsInline
          width="300"
          style={{ border: "2px solid #666", borderRadius: "8px" }}
        />
      </div>
      <div>
        <h3>Friend</h3>
        <video
          ref={remoteVideo}
          autoPlay
          playsInline
          width="300"
          style={{ border: "2px solid #666", borderRadius: "8px" }}
        />
      </div>
      <div style={{ marginTop: "1rem" }}>
        <button onClick={callUser} style={{ padding: "0.5rem 1rem" }}>
          Start Call
        </button>
      </div>
    </div>
  );
}
