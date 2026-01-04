"use client"; // Required for drag and drop interactions

import React, { useState } from 'react';
import { DndContext, useDraggable, useDroppable, DragOverlay, DragEndEvent, DragStartEvent } from '@dnd-kit/core';

// Configuration
const TIER_ORDER = ['S', 'A', 'B', 'C', 'D'];

// --- COMPONENT 1: Draggable Item ---
function DraggableItem({ id, isOverlay }: { id: string, isOverlay?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: id,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 999,
    opacity: isDragging ? 0 : 1,
  } : undefined;

  const overlayStyle = isOverlay ? {
    transform: 'scale(1.1)',
    boxShadow: '0 5px 15px rgba(0,0,0,0.5)',
    cursor: 'grabbing',
    zIndex: 1000
  } : style;

  return (
    <div
      ref={setNodeRef}
      style={overlayStyle}
      {...listeners}
      {...attributes}
      className="draggable-item"
    >
      {id}
    </div>
  );
}

// --- COMPONENT 2: Droppable Tier Row ---
function DroppableTier({ id, items }: { id: string, items: string[] }) {
  const { isOver, setNodeRef } = useDroppable({
    id: id,
  });

  const style = {
    backgroundColor: isOver ? '#2a2a2a' : undefined,
  };

  return (
    <div className="tier-row">
      <div className={`tier-label label-${id}`}>{id}</div>
      <div ref={setNodeRef} style={style} className="drop-zone">
        {items.map(itemId => (
          <DraggableItem key={itemId} id={itemId} />
        ))}
      </div>
    </div>
  );
}

// --- COMPONENT 3: Home/Lobby Screen ---
interface HomeScreenProps {
  onStart: (info: { username: string; roomId: string; isHost: boolean }) => void;
}

function HomeScreen({ onStart }: HomeScreenProps) {
  const [username, setUsername] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');

  const handleCreate = () => {
    if (!username) return alert('Bitte gib einen Namen ein!');
    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    onStart({ username, roomId: newRoomId, isHost: true });
  };

  const handleJoin = () => {
    if (!username) return alert('Bitte gib einen Namen ein!');
    if (!joinRoomId) return alert('Bitte gib eine Raum-ID ein!');
    onStart({ username, roomId: joinRoomId, isHost: false });
  };

  return (
    <div className="home-container">
      <div className="home-card">
        <h1 className="text-3xl font-bold mb-2">Ultimate Tier Maker</h1>
        <p className="text-gray-400 mb-6">Party Edition</p>

        <div className="input-group">
          <label>Dein Name</label>
          <input
            type="text"
            className="sidebar-input"
            placeholder="z.B. Alex"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        <div className="divider"><span>NEUE PARTY</span></div>

        <button className="btn btn-create" onClick={handleCreate}>
          Party erstellen
        </button>

        <div className="divider"><span>ODER BEITRETEN</span></div>

        <div className="join-section">
          <input
            type="text"
            className="sidebar-input mb-2"
            placeholder="Raum Code"
            value={joinRoomId}
            onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
          />
          <button className="btn btn-join" onClick={handleJoin}>
            Beitreten
          </button>
        </div>
      </div>
    </div>
  );
}

// --- COMPONENT 4: The Game ---
interface PartyInfo {
  username: string;
  roomId: string;
  isHost: boolean;
}

interface TierListGameProps {
  partyInfo: PartyInfo;
  onExit: () => void;
}

function TierListGame({ partyInfo, onExit }: TierListGameProps) {
  // Initial State
  const [tiers, setTiers] = useState<{ [key: string]: string[] }>({
    S: [],
    A: [],
    B: [],
    C: [],
    D: [],
    Pool: ['Pizza', 'Burger', 'Sushi', 'Döner', 'Salat', 'Pasta', 'Currywurst', 'Schnitzel', 'Tacos', 'Eis'],
  });

  const [activeId, setActiveId] = useState<string | null>(null);

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { over, active } = event;
    setActiveId(null);

    if (!over) return;

    const itemId = active.id as string;
    const toTierId = over.id as string;

    let fromTierId;
    for (const tierKey in tiers) {
      if (tiers[tierKey].includes(itemId)) {
        fromTierId = tierKey;
        break;
      }
    }

    if (!fromTierId || fromTierId === toTierId) return;

    setTiers(prevTiers => {
      const sourceArray = [...prevTiers[fromTierId!]];
      const targetArray = [...prevTiers[toTierId]];

      // Remove from source
      sourceArray.splice(sourceArray.indexOf(itemId), 1);
      // Add to target
      targetArray.push(itemId);

      return {
        ...prevTiers,
        [fromTierId!]: sourceArray,
        [toTierId]: targetArray,
      };
    });
  }

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="container">
        {/* Header with Party Info */}
        <div className="game-header">
          <div className="party-info">
            <span>Raum: <strong>{partyInfo.roomId}</strong></span>
            <span>Spieler: <strong>{partyInfo.username}</strong></span>
          </div>
          <button className="btn btn-exit" onClick={onExit}>Verlassen</button>
        </div>

        {TIER_ORDER.map(tierId => (
          <DroppableTier key={tierId} id={tierId} items={tiers[tierId]} />
        ))}

        <div className="pool-container">
          <h3 className="text-xl font-bold mb-4">Pool</h3>
          <DroppableTier id="Pool" items={tiers.Pool} />
        </div>
      </div>

      <DragOverlay>
        {activeId ? <DraggableItem id={activeId} isOverlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}

// --- MAIN PAGE COMPONENT ---
export default function Home() {
  const [screen, setScreen] = useState<'home' | 'game'>('home');
  const [partyInfo, setPartyInfo] = useState<PartyInfo | null>(null);

  const startGame = (info: PartyInfo) => {
    setPartyInfo(info);
    setScreen('game');
  };

  const exitGame = () => {
    setPartyInfo(null);
    setScreen('home');
  };

  return (
    <main className="min-h-screen bg-[#222]">
      {screen === 'home' ? (
        <HomeScreen onStart={startGame} />
      ) : (
        partyInfo && <TierListGame partyInfo={partyInfo} onExit={exitGame} />
      )}
    </main>
  );
}