"use client";

import React, { useState, useEffect, useRef } from 'react';
import { DndContext, useDraggable, useDroppable, DragOverlay, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import io, { Socket } from 'socket.io-client';

// --- CONFIGURATION ---
// IMPORTANT: In Railway Frontend Settings, add Variable: NEXT_PUBLIC_SOCKET_URL
// Value: The URL of your backend (e.g. https://backend-production.up.railway.app)
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
const TIER_ORDER = ['S', 'A', 'B', 'C', 'D'];

// --- DRAGGABLE ITEM ---
function DraggableItem({ id, isOverlay }: { id: string, isOverlay?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  
  const style: React.CSSProperties | undefined = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 999,
    opacity: isDragging ? 0 : 1,
  } : undefined;

  const overlayStyle: React.CSSProperties | undefined = isOverlay ? {
    transform: 'scale(1.1)', boxShadow: '0 5px 15px rgba(0,0,0,0.5)', cursor: 'grabbing', zIndex: 1000
  } : style;

  const isImage = id.startsWith('http') || id.startsWith('data:image');

  return (
    <div ref={setNodeRef} style={overlayStyle} {...listeners} {...attributes} className="draggable-item relative">
      {isImage ? (
        <img 
          src={id} alt="item" referrerPolicy="no-referrer"
          className="w-full h-full object-cover pointer-events-none select-none"
        />
      ) : (
        <span className="p-2 truncate w-full text-center block">{id}</span>
      )}
    </div>
  );
}

// --- DROPPABLE TIER ---
function DroppableTier({ id, items, isPool, onFileUpload }: { id: string, items: string[], isPool?: boolean, onFileUpload?: (file: File) => void }) {
  const { isOver, setNodeRef } = useDroppable({ id });
  const bgStyle = isOver ? '#2a2a2a' : undefined;

  const handleNativeDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isPool || !onFileUpload) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className={`tier-row ${isPool ? 'min-h-[120px]' : ''}`}>
      {!isPool && <div className={`tier-label label-${id}`}>{id}</div>}
      
      <div 
        ref={setNodeRef} 
        style={{ backgroundColor: bgStyle }} 
        className={isPool ? "drop-zone pool-zone" : "drop-zone"}
        onDrop={handleNativeDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        {items.map(itemId => <DraggableItem key={itemId} id={itemId} />)}
        
        {isPool && items.length === 0 && (
          <div className="text-gray-500 italic pointer-events-none p-4 select-none w-full text-center">
            Drag & Drop images here
          </div>
        )}
      </div>
    </div>
  );
}

// --- SIDEBAR ---
function PlayerSidebar({ players, roomId, currentUser, isConnected }: { players: any[], roomId: string, currentUser: string, isConnected: boolean }) {
  return (
    <div className="w-64 bg-[#1a1a1a] border-r border-[#333] flex flex-col h-screen sticky top-0 hidden md:flex">
      <div className="p-4 border-b border-[#333]">
        <h2 className="text-sm text-gray-400 uppercase tracking-wider font-bold mb-1">Room Code</h2>
        <div className="text-2xl text-white font-mono font-bold tracking-widest bg-[#222] p-2 rounded text-center border border-[#444] select-all">
          {roomId}
        </div>
        <div className="mt-2 flex items-center justify-center gap-2 text-xs">
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
          <span className={isConnected ? 'text-green-500' : 'text-red-500'}>
            {isConnected ? 'Server Online' : 'Disconnected'}
          </span>
        </div>
      </div>
      <div className="flex-1 p-4 overflow-y-auto">
        <h3 className="text-sm text-gray-400 uppercase tracking-wider font-bold mb-3">Players ({players.length})</h3>
        <ul className="space-y-2">
          {players.map((p) => (
            <li key={p.id} className="flex items-center gap-2 text-white p-2 rounded bg-[#252525]">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className={p.username === currentUser ? "font-bold text-yellow-400" : ""}>
                {p.username} {p.username === currentUser && "(You)"}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// --- HOME SCREEN ---
function HomeScreen({ onStart }: { onStart: (info: any) => void }) {
  const [username, setUsername] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  const handleCreate = () => {
    if (!username) return alert('Name required!');
    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    onStart({ username, roomId: newRoomId, isHost: true });
  };

  const handleJoin = async () => {
    if (!username || !joinRoomId) return alert('Name and Room ID required!');
    setIsChecking(true);
    try {
      // Use the global SOCKET_URL for the API check
      const response = await fetch(`${SOCKET_URL}/api/check-room/${joinRoomId}`);
      if (!response.ok) throw new Error('Network response was not ok');
      
      const data = await response.json();
      if (data.exists) onStart({ username, roomId: joinRoomId, isHost: false });
      else alert('❌ Room not found');
    } catch (e) {
      console.error(e);
      alert(`Could not connect to server at ${SOCKET_URL}. Check your connection.`);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="home-container">
      <div className="home-card">
        <h1 className="text-3xl font-bold mb-2">Ultimate Tier Maker</h1>
        <p className="text-gray-400 mb-6">Multiplayer Edition</p>
        <div className="input-group">
          <label>Name</label>
          <input type="text" className="sidebar-input" placeholder="e.g. Alex" value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div className="divider"><span>NEW PARTY</span></div>
        <button className="btn btn-create" onClick={handleCreate}>Create Party</button>
        <div className="divider"><span>JOIN PARTY</span></div>
        <div className="join-section">
          <input type="text" className="sidebar-input mb-2" placeholder="Room Code" value={joinRoomId} onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())} />
          <button className="btn btn-join" onClick={handleJoin} disabled={isChecking}>{isChecking ? 'Checking...' : 'Join'}</button>
        </div>
      </div>
    </div>
  );
}

// --- GAME LOGIC ---
function TierListGame({ partyInfo, onExit }: { partyInfo: any, onExit: () => void }) {
  const [tiers, setTiers] = useState<{ [key: string]: string[] }>({ S: [], A: [], B: [], C: [], D: [], Pool: [] });
  const [players, setPlayers] = useState<any[]>([]); 
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  // Prevent browser from opening files
  useEffect(() => {
    const preventBrowserDrop = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes('Files')) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('dragover', preventBrowserDrop);
    window.addEventListener('drop', preventBrowserDrop);
    return () => {
      window.removeEventListener('dragover', preventBrowserDrop);
      window.removeEventListener('drop', preventBrowserDrop);
    };
  }, []);

  // Socket Connection
  useEffect(() => {
    // Connect to the backend URL
    socketRef.current = io(SOCKET_URL, {
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current.on('connect', () => {
      console.log("Connected to server");
      setIsConnected(true);
      socketRef.current?.emit('join_room', { roomId: partyInfo.roomId, username: partyInfo.username });
    });

    socketRef.current.on('disconnect', () => {
      console.log("Disconnected from server");
      setIsConnected(false);
    });

    socketRef.current.on('receive_state', (updatedTiers) => setTiers(updatedTiers));
    socketRef.current.on('update_players', (updatedPlayers) => setPlayers(updatedPlayers));

    return () => { 
      socketRef.current?.disconnect(); 
    };
  }, [partyInfo]);

  function handleDragEnd(event: DragEndEvent) {
    const { over, active } = event;
    setActiveId(null);
    if (!over) return;
    const itemId = active.id as string;
    const toTierId = over.id as string;
    
    let fromTierId;
    for (const tierKey in tiers) if (tiers[tierKey].includes(itemId)) fromTierId = tierKey;
    if (!fromTierId || fromTierId === toTierId) return;

    const newTiers = { ...tiers };
    const sourceArray = [...newTiers[fromTierId]];
    const targetArray = [...newTiers[toTierId]];
    
    sourceArray.splice(sourceArray.indexOf(itemId), 1);
    targetArray.push(itemId);
    
    newTiers[fromTierId] = sourceArray;
    newTiers[toTierId] = targetArray;

    setTiers(newTiers);
    socketRef.current?.emit('update_tiers', { roomId: partyInfo.roomId, newTiers });
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) return alert('Please drop an image file!');
    if (file.size > 5 * 1024 * 1024) return alert('File is too large! Max 5MB.');

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result as string;
      if (base64String) {
        socketRef.current?.emit('add_item', { roomId: partyInfo.roomId, item: base64String });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-row h-screen overflow-hidden bg-[#222]">
      {/* Sidebar */}
      <PlayerSidebar players={players} roomId={partyInfo.roomId} currentUser={partyInfo.username} isConnected={isConnected} />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="container mx-auto p-4 md:p-8">
            <div className="flex justify-between items-start md:items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold">Ranking Board</h1>
                {/* Mobile Info Bar */}
                <div className="md:hidden text-xs text-gray-400 mt-1 flex flex-wrap gap-2">
                   <span>Room: <b className="text-white">{partyInfo.roomId}</b></span>
                   <span>Status: <b className={isConnected ? "text-green-500" : "text-red-500"}>{isConnected ? "Online" : "Offline"}</b></span>
                </div>
              </div>
              <button className="btn btn-exit" onClick={onExit}>Exit</button>
            </div>

            {TIER_ORDER.map(tierId => (
              <DroppableTier key={tierId} id={tierId} items={tiers[tierId]} />
            ))}
            
            <div className="pool-container mt-6">
              <div className="mb-2">
                <h3 className="text-xl font-bold">Pool</h3>
              </div>
              <DroppableTier 
                id="Pool" 
                items={tiers.Pool} 
                isPool 
                onFileUpload={handleFileUpload} 
              />
            </div>
          </div>
          <DragOverlay>{activeId ? <DraggableItem id={activeId} isOverlay /> : null}</DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}

export default function Home() {
  const [screen, setScreen] = useState<'home' | 'game'>('home');
  const [partyInfo, setPartyInfo] = useState<any>(null);

  const startGame = (info: any) => { setPartyInfo(info); setScreen('game'); };
  const exitGame = () => { setPartyInfo(null); setScreen('home'); };

  return (
    <main className="min-h-screen bg-[#222] text-white font-sans">
      {screen === 'home' ? <HomeScreen onStart={startGame} /> : <TierListGame partyInfo={partyInfo} onExit={exitGame} />}
    </main>
  );
}