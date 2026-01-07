// @ts-nocheck
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { DndContext, useDraggable, useDroppable, DragOverlay } from '@dnd-kit/core';
import io from 'socket.io-client';

// --- CONFIGURATION ---
// 1. In Railway Frontend Variables, set NEXT_PUBLIC_SOCKET_URL to your BACKEND URL.
// 2. Example Value: https://tier-list-backend-production.up.railway.app
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
const TIER_ORDER = ['S', 'A', 'B', 'C', 'D'];

// --- DRAGGABLE ITEM ---
function DraggableItem({ id, isOverlay }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  
  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 999,
    opacity: isDragging ? 0 : 1,
  } : undefined;

  const overlayStyle = isOverlay ? {
    transform: 'scale(1.1)', boxShadow: '0 5px 15px rgba(0,0,0,0.5)', cursor: 'grabbing', zIndex: 1000
  } : style;

  const isImage = id.startsWith('http') || id.startsWith('data:image');

  return (
    <div ref={setNodeRef} style={overlayStyle} {...listeners} {...attributes} className="draggable-item relative cursor-grab active:cursor-grabbing">
      {isImage ? (
        <img 
          src={id} alt="item" referrerPolicy="no-referrer"
          className="w-full h-full object-cover pointer-events-none select-none rounded"
        />
      ) : (
        <span className="p-2 truncate w-full text-center block font-bold text-sm bg-gray-800 text-white rounded">{id}</span>
      )}
    </div>
  );
}

// --- DROPPABLE TIER ---
function DroppableTier({ id, items, isPool, onFileUpload }) {
  const { isOver, setNodeRef } = useDroppable({ id });
  const bgStyle = isOver ? '#2a2a2a' : undefined;

  const handleNativeDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isPool || !onFileUpload) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className={`tier-row flex ${isPool ? 'min-h-[120px] bg-[#111]' : 'items-stretch mb-2'} rounded overflow-hidden border border-[#333]`}>
      {!isPool && (
        <div className={`tier-label w-24 flex-shrink-0 flex items-center justify-center text-2xl font-bold text-black label-${id}`} style={{minHeight: '80px'}}>
          {id}
        </div>
      )}
      
      <div 
        ref={setNodeRef} 
        style={{ backgroundColor: bgStyle }} 
        className={`flex-1 flex flex-wrap gap-2 p-2 min-h-[80px] transition-colors ${isPool ? "justify-center items-center" : "bg-[#1e1e1e]"}`}
        onDrop={handleNativeDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        {items.map(itemId => <DraggableItem key={itemId} id={itemId} />)}
        
        {isPool && items.length === 0 && (
          <div className="text-gray-500 italic pointer-events-none p-4 select-none w-full text-center text-sm border-2 border-dashed border-[#333] rounded">
            Drag & Drop images here
          </div>
        )}
      </div>
    </div>
  );
}

// --- SIDEBAR ---
function PlayerSidebar({ players, roomId, currentUser, isConnected }) {
  return (
    <div className="w-64 bg-[#1a1a1a] border-r border-[#333] flex flex-col h-screen sticky top-0 hidden md:flex">
      <div className="p-4 border-b border-[#333]">
        <h2 className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-2">Room Code</h2>
        <div className="text-2xl text-white font-mono font-bold tracking-widest bg-black p-3 rounded text-center border border-[#333] select-all shadow-inner">
          {roomId}
        </div>
        <div className="mt-3 flex items-center justify-center gap-2 text-xs font-medium bg-[#222] py-1 rounded-full">
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`}></span>
          <span className={isConnected ? 'text-green-400' : 'text-red-400'}>
            {isConnected ? 'Server Online' : 'Connecting...'}
          </span>
        </div>
      </div>
      <div className="flex-1 p-4 overflow-y-auto">
        <h3 className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-3">Players ({players.length})</h3>
        <ul className="space-y-2">
          {players.map((p) => (
            <li key={p.id} className="flex items-center gap-3 text-gray-300 p-2 rounded hover:bg-[#252525] transition-colors">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
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
function HomeScreen({ onStart }) {
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
      alert(`Could not connect to server. Ensure BACKEND is running and URL is correct.\nURL: ${SOCKET_URL}`);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#111] to-[#222] p-4">
      <div className="max-w-md w-full bg-[#1a1a1a] p-8 rounded-xl border border-[#333] shadow-2xl">
        <h1 className="text-4xl font-black text-white mb-2 text-center tracking-tighter">TIER MAKER</h1>
        <p className="text-gray-500 mb-8 text-center uppercase text-xs tracking-[0.2em]">Multiplayer Real-time</p>
        
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Your Name</label>
            <input 
              type="text" 
              className="w-full bg-black border border-[#333] text-white p-4 rounded focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-bold" 
              placeholder="Enter name..." 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
            />
          </div>

          <div className="pt-4 border-t border-[#333]">
            <button 
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg mb-4" 
              onClick={handleCreate}
            >
              CREATE NEW ROOM
            </button>
            
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-[#333]"></div>
              <span className="flex-shrink-0 mx-4 text-gray-600 text-xs font-bold uppercase">OR JOIN</span>
              <div className="flex-grow border-t border-[#333]"></div>
            </div>

            <div className="flex gap-2 mt-4">
              <input 
                type="text" 
                className="flex-1 bg-black border border-[#333] text-white p-4 rounded focus:outline-none focus:border-green-500 font-mono uppercase tracking-widest" 
                placeholder="CODE" 
                value={joinRoomId} 
                onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())} 
              />
              <button 
                className="bg-green-600 hover:bg-green-500 text-white font-bold px-8 rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed" 
                onClick={handleJoin} 
                disabled={isChecking}
              >
                {isChecking ? '...' : 'JOIN'}
              </button>
            </div>
          </div>
        </div>
        
        <div className="mt-8 text-center">
          <p className="text-[10px] text-gray-600">
             {SOCKET_URL.includes('localhost') ? '⚠️ Using Localhost (Offline Mode)' : '✅ Connected to Production Server'}
          </p>
        </div>
      </div>
    </div>
  );
}

// --- GAME LOGIC ---
function TierListGame({ partyInfo, onExit }) {
  const [tiers, setTiers] = useState({ S: [], A: [], B: [], C: [], D: [], Pool: [] });
  const [players, setPlayers] = useState([]); 
  const [activeId, setActiveId] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    const preventBrowserDrop = (e) => {
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

  useEffect(() => {
    // Force websocket transport for better stability on some networks
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
    });

    socketRef.current.on('connect', () => {
      console.log("Connected to server:", SOCKET_URL);
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

  function handleDragEnd(event) {
    const { over, active } = event;
    setActiveId(null);
    if (!over) return;
    const itemId = active.id;
    const toTierId = over.id;
    
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

  function handleDragStart(event) {
    setActiveId(event.active.id);
  }

  const handleFileUpload = (file) => {
    if (!file.type.startsWith('image/')) return alert('Please drop an image file!');
    if (file.size > 5 * 1024 * 1024) return alert('File is too large! Max 5MB.');

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result;
      if (base64String) {
        socketRef.current?.emit('add_item', { roomId: partyInfo.roomId, item: base64String });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-row h-screen overflow-hidden bg-[#0a0a0a]">
      <PlayerSidebar players={players} roomId={partyInfo.roomId} currentUser={partyInfo.username} isConnected={isConnected} />

      <div className="flex-1 overflow-y-auto">
        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="container mx-auto p-4 md:p-8 max-w-5xl">
            <div className="flex justify-between items-start md:items-center mb-8 bg-[#1a1a1a] p-4 rounded-lg border border-[#333]">
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight">RANKING BOARD</h1>
                <div className="md:hidden text-xs text-gray-400 mt-2 flex flex-wrap gap-3">
                   <span className="bg-[#222] px-2 py-1 rounded border border-[#333]">Room: <b className="text-white font-mono">{partyInfo.roomId}</b></span>
                   <span className="flex items-center gap-1">
                     <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                     <b className={isConnected ? "text-green-500" : "text-red-500"}>{isConnected ? "Online" : "Offline"}</b>
                   </span>
                </div>
              </div>
              <button className="bg-red-900/30 hover:bg-red-900/50 text-red-500 border border-red-900/50 font-bold py-2 px-6 rounded transition-all text-sm uppercase tracking-wider" onClick={onExit}>Exit Room</button>
            </div>

            <div className="space-y-1">
              {TIER_ORDER.map(tierId => (
                <DroppableTier key={tierId} id={tierId} items={tiers[tierId]} />
              ))}
            </div>
            
            <div className="mt-8">
              <div className="mb-3 flex items-center gap-2">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Image Pool</h3>
                <span className="text-[10px] text-gray-600 bg-[#1a1a1a] px-2 py-1 rounded">DRAG IMAGES HERE</span>
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
  const [screen, setScreen] = useState('home');
  const [partyInfo, setPartyInfo] = useState(null);

  const startGame = (info) => { setPartyInfo(info); setScreen('game'); };
  const exitGame = () => { setPartyInfo(null); setScreen('home'); };

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-blue-500/30">
      {screen === 'home' ? <HomeScreen onStart={startGame} /> : <TierListGame partyInfo={partyInfo} onExit={exitGame} />}
    </main>
  );
}