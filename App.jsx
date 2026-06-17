import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { db } from './firebase';
import { 
  doc, setDoc, onSnapshot, updateDoc, arrayUnion, 
  serverTimestamp, collection, query, orderBy 
} from 'firebase/firestore';

// --- UTILS: Random ID Generator ---
const generateRoomId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// ==========================================
// 🏠 HOME COMPONENT
// ==========================================
function Home() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleCreateRoom = async () => {
    setLoading(true);
    const roomId = generateRoomId();
    const roomRef = doc(db, 'rooms', roomId);

    try {
      // Create initial room data
      await setDoc(roomRef, {
        createdAt: serverTimestamp(),
        exists: true
      });

      const inviteLink = `${window.location.origin}/chat/${roomId}`;
      await navigator.clipboard.writeText(inviteLink);
      alert('🔒 Private Room Created & Link Copied to Clipboard!');
      
      navigate(`/chat/${roomId}`);
    } catch (error) {
      console.error("Error creating room: ", error);
      alert("Failed to create room. Check Firestore Rules.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container center-all">
      <div className="glass-card text-center hero">
        <h1 className="logo-title">🔥 Chat_me</h1>
        <p className="subtitle">Ephemeral. Private. Direct.</p>
        <p className="desc">Create a secure link, share it, and start chatting. No registration, no tracks.</p>
        <button onClick={handleCreateRoom} disabled={loading} className="btn-primary">
          {loading ? 'Generating Security...' : '🚀 Create Private Room'}
        </button>
      </div>
    </div>
  );
}

// ==========================================
// 💬 CHAT ROOM COMPONENT
// ==========================================
function ChatRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [username, setUsername] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const [onlineCount, setOnlineCount] = useState(0);
  
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Auto Scroll
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isJoined) scrollToBottom();
  }, [messages, isJoined]);

  // Firebase Realtime Listener for Messages & Members
  useEffect(() => {
    if (!isJoined) return;

    const roomRef = doc(db, 'rooms', roomId);
    
    const unsubscribe = onSnapshot(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        // Set messages (sorted or array-based)
        if (data.messages) {
          setMessages(data.messages);
        }
        // Online status / Typing system data
        if (data.typing) {
          setTypingUsers(data.typing);
        }
        if (data.members) {
          setOnlineCount(data.members.length);
        }
      } else {
        // Auto-create room if someone visits a dead link directly
        setDoc(roomRef, { createdAt: serverTimestamp(), exists: true });
      }
    });

    return () => unsubscribe();
  }, [roomId, isJoined]);

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!username.trim()) return;

    const roomRef = doc(db, 'rooms', roomId);
    // Send System joined message
    await updateDoc(roomRef, {
      members: arrayUnion(username),
      messages: arrayUnion({
        id: Math.random().toString(),
        text: `⚡ ${username} has joined the shadow chat.`,
        type: 'system',
        timestamp: Date.now()
      })
    });
    setIsJoined(true);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const roomRef = doc(db, 'rooms', roomId);
    const newMessage = {
      id: Math.random().toString(),
      sender: username,
      text: inputText,
      type: 'user',
      timestamp: Date.now()
    };

    setInputText('');
    // Remove typing indicator on send
    await updateDoc(roomRef, {
      [`typing.${username}`]: false
    });

    await updateDoc(roomRef, {
      messages: arrayUnion(newMessage)
    });
  };

  const handleTyping = async () => {
    const roomRef = doc(db, 'rooms', roomId);
    await updateDoc(roomRef, {
      [`typing.${username}`]: true
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(async () => {
      await updateDoc(roomRef, {
        [`typing.${username}`]: false
      });
    }, 2000);
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('🔗 Shareable invite link copied!');
  };

  if (!isJoined) {
    return (
      <div className="container center-all">
        <div className="glass-card text-center">
          <h2>Enter the Void</h2>
          <p className="subtitle">Pick an anonymous handle to join</p>
          <form onSubmit={handleJoin} className="join-form">
            <input 
              type="text" 
              placeholder="e.g., CyberGhost" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)}
              required
              maxLength={15}
            />
            <button type="submit" className="btn-primary">Enter Chat</button>
          </form>
          <button onClick={() => navigate('/')} className="btn-secondary" style={{marginTop: '10px'}}>
            ← Back Home
          </button>
        </div>
      </div>
    );
  }

  // Check if anyone else is typing
  const anyoneTyping = Object.entries(typingUsers).some(([user, isTyping]) => user !== username && isTyping);

  return (
    <div className="chat-layout">
      {/* Header */}
      <header className="chat-header">
        <div className="room-info">
          <h3>Room: {roomId}</h3>
          <span className="online-badge">🟢 {onlineCount} online</span>
        </div>
        <button onClick={copyInviteLink} className="btn-share">📋 Copy Link</button>
      </header>

      {/* Messages Feed */}
      <div className="messages-container">
        {messages.map((msg) => (
          <div key={msg.id} className={`message-wrapper ${msg.type === 'system' ? 'system-msg' : msg.sender === username ? 'my-msg' : 'their-msg'}`}>
            {msg.type === 'user' && <span className="msg-sender">{msg.sender}</span>}
            <div className="msg-bubble">
              <p>{msg.text}</p>
              {msg.type === 'user' && (
                <span className="msg-time">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>
        ))}
        {anyoneTyping && (
          <div className="typing-indicator">
            <span>Someone is typing...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <form onSubmit={handleSendMessage} className="chat-input-area">
        <input 
          type="text" 
          placeholder="Type an encrypted message..." 
          value={inputText}
          onChange={(e) => { setInputText(e.target.value); handleTyping(); }}
        />
        <button type="submit">⚡</button>
      </form>
    </div>
  );
}

// ==========================================
// 🔀 MAIN APP ROUTING
// ==========================================
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/chat/:roomId" element={<ChatRoom />} />
      </Routes>
    </BrowserRouter>
  );
}
