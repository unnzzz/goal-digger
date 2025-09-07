"use client";
import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import AppLayout from "@/components/AppLayout";
import { useAvatar } from "@/contexts/AvatarContext";
import { getMessageForAction } from "@/lib/avatarMessages";

type Owned = { 
  id: string; 
  placed: boolean; 
  posX: number | null; 
  posY: number | null; 
  rotation: number;
  scale: number;
  item: { 
    id: string; 
    name: string; 
    cost: number;
    category: string;
  }
};

export default function RoomPage() {
  const [items, setItems] = useState<Owned[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedItem, setDraggedItem] = useState<Owned | null>(null);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(true);
  const roomRef = useRef<HTMLDivElement>(null);
  const { showMessage } = useAvatar();

  const load = async () => {
    setLoading(true);
    const r = await fetch("/api/room/inventory", { cache: "no-store" });
    const j = await r.json();
    // Add default rotation and scale values
    const itemsWithDefaults = (j.items ?? []).map((item: Owned) => ({
      ...item,
      rotation: item.rotation || 0,
      scale: item.scale || 1
    }));
    
    // Add default table item if not already present
    const hasTable = itemsWithDefaults.some((item: Owned) => item.item.name === "Table");
    if (!hasTable) {
      const defaultTable: Owned = {
        id: "default-table",
        placed: true,
        posX: 400, // Center of room (assuming room is ~800px wide)
        posY: 300, // Center of room (assuming room is ~600px tall)
        rotation: 0,
        scale: 5, // Very large table
        item: {
          id: "default-table",
          name: "Table",
          cost: 0,
          category: "DEFAULT"
        }
      };
      itemsWithDefaults.push(defaultTable);
    }
    
    setItems(itemsWithDefaults);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Show avatar message when room page loads
  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        showMessage(getMessageForAction('room_visited'));
      }, 2000); // Longer delay
      return () => clearTimeout(timer);
    }
  }, [loading, showMessage]);

  const getFurnitureImagePath = (itemName: string) => {
    // Special case for default table
    if (itemName === "Table") {
      return "/furniture/table.png";
    }
    const cleanName = itemName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    return `/furniture/${cleanName}.png`;
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, item: Owned) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedItem || !roomRef.current) return;

    const rect = roomRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Update item position
    const updatedItems = items.map(item => 
      item.id === draggedItem.id 
        ? { ...item, placed: true, posX: x, posY: y }
        : item
    );
    setItems(updatedItems);

    // Save to server
    await fetch("/api/room/place", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemId: draggedItem.id,
        posX: x,
        posY: y,
        placed: true
      })
    });

    // Show instant avatar message for room decoration
    showMessage(getMessageForAction('room_decorated'), true);

    setDraggedItem(null);
  };

  const handleItemDragStart = (e: React.DragEvent, item: Owned) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleItemDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedItem || !roomRef.current) return;

    const rect = roomRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Update item position
    const updatedItems = items.map(item => 
      item.id === draggedItem.id 
        ? { ...item, posX: x, posY: y }
        : item
    );
    setItems(updatedItems);

    // Save to server
    await fetch("/api/room/place", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemId: draggedItem.id,
        posX: x,
        posY: y,
        placed: true
      })
    });

    setDraggedItem(null);
  };

  const handleItemClick = (itemId: string) => {
    setSelectedItem(selectedItem === itemId ? null : itemId);
  };

  const handleRotate = async (itemId: string, direction: 'left' | 'right') => {
    const rotationDelta = direction === 'left' ? -15 : 15;
    const updatedItems = items.map(item => 
      item.id === itemId 
        ? { ...item, rotation: (item.rotation + rotationDelta) % 360 }
        : item
    );
    setItems(updatedItems);

    const item = updatedItems.find(i => i.id === itemId);
    if (item) {
      await fetch("/api/room/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId,
          rotation: item.rotation
        })
      });
    }
  };

  const handleScale = async (itemId: string, direction: 'in' | 'out') => {
    const scaleDelta = direction === 'in' ? 0.1 : -0.1;
    const updatedItems = items.map(item => 
      item.id === itemId 
        ? { ...item, scale: Math.max(0.3, Math.min(2, item.scale + scaleDelta)) }
        : item
    );
    setItems(updatedItems);

    const item = updatedItems.find(i => i.id === itemId);
    if (item) {
      await fetch("/api/room/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId,
          scale: item.scale
        })
      });
    }
  };

  const handleSaveRoom = () => {
    setIsEditing(false);
    setSelectedItem(null);
    
    // Show instant avatar message for room saving
    showMessage(getMessageForAction('room_saved'), true);
  };

  const handleEditRoom = () => {
    setIsEditing(true);
  };

  const placedItems = items.filter(item => item.placed);
  const inventoryItems = items.filter(item => !item.placed);

  return (
    <AppLayout activePage="room">
      <div style={{ 
        display: "flex", 
        height: "calc(100vh - 80px)", 
        gap: "0px", 
        padding: "0px",
        background: "transparent"
      }}>
        {/* Central Room View - ENTIRE PAGE */}
        <div style={{ 
          flex: 1, 
          background: "transparent", 
          borderRadius: "20px", 
          padding: "0px",
          position: "relative",
          overflow: "visible",
          boxShadow: "none",
          minWidth: "1160px",
          height: "100%",
          marginLeft: "20px",
          marginTop: "20px",
          display: "flex",
          flexDirection: "column"
        }}>
          {/* Room Title - Above Picture */}
          <div style={{ 
            textAlign: "center", 
            color: "#2d3748",
            marginBottom: "10px",
            background: "rgba(255, 255, 255, 0.9)",
            padding: "20px",
            borderRadius: "15px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
            backdropFilter: "blur(10px)"
          }}>
            <h1 style={{ 
              fontSize: "24px", 
              fontWeight: "700", 
              margin: "0 0 8px 0",
              background: "linear-gradient(45deg, #667eea, #764ba2)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}>
              Your Room
            </h1>
            <p style={{ 
              fontSize: "14px", 
              opacity: 0.7, 
              margin: "0 0 15px 0" 
            }}>
              Decorate your space with furniture you've earned
            </p>
            
            {/* Save/Edit Room Buttons */}
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              {isEditing ? (
                <button
                  onClick={handleSaveRoom}
                  style={{
                    background: "linear-gradient(45deg, #667eea, #764ba2)",
                    color: "white",
                    border: "none",
                    borderRadius: "10px",
                    padding: "10px 20px",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: "pointer",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    transition: "transform 0.2s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  💾 Save Room
                </button>
              ) : (
                <button
                  onClick={handleEditRoom}
                  style={{
                    background: "linear-gradient(45deg, #667eea, #764ba2)",
                    color: "white",
                    border: "none",
                    borderRadius: "10px",
                    padding: "10px 20px",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: "pointer",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    transition: "transform 0.2s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  ✏️ Edit Room
                </button>
              )}
            </div>
          </div>

          {/* Room Container with Room Image - ENTIRE PAGE */}
          <div 
            ref={roomRef}
            style={{
              position: "relative",
              width: "100%",
              flex: 1,
              background: "#ffffff",
              borderRadius: "20px",
              border: "none",
              boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
              overflow: "hidden"
            }}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {/* Room Image Background */}
            <div style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              backgroundImage: "url('/room-background.png')",
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat"
            }} />

            {/* Placed Furniture */}
            {placedItems.map(item => (
              <div
                key={item.id}
                draggable={isEditing}
                onDragStart={isEditing ? (e) => handleItemDragStart(e, item) : undefined}
                onDragOver={isEditing ? handleDragOver : undefined}
                onDrop={isEditing ? handleItemDrop : undefined}
                style={{
                  position: "absolute",
                  left: item.posX || 0,
                  top: item.posY || 0,
                  transform: `rotate(${item.rotation}deg)`,
                  transformOrigin: "center",
                  cursor: isEditing ? "grab" : "default",
                  zIndex: selectedItem === item.id ? 20 : 10,
                  border: selectedItem === item.id && isEditing ? "2px solid #667eea" : "none",
                  borderRadius: "8px",
                  padding: "4px"
                }}
                onClick={isEditing ? () => handleItemClick(item.id) : undefined}
              >
                <Image
                  src={getFurnitureImagePath(item.item.name)}
                  alt={item.item.name}
                  width={60 * item.scale}
                  height={60 * item.scale}
                  draggable={false}
                />
                
                {/* Controls for selected item - only in editing mode */}
                {selectedItem === item.id && isEditing && (
                  <div style={{
                    position: "absolute",
                    top: "-40px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    display: "flex",
                    gap: "8px",
                    background: "rgba(0, 0, 0, 0.8)",
                    padding: "8px",
                    borderRadius: "8px",
                    zIndex: 30
                  }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRotate(item.id, 'left');
                      }}
                      style={{
                        background: "#667eea",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        padding: "4px 8px",
                        cursor: "pointer",
                        fontSize: "12px"
                      }}
                    >
                      ↺
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleScale(item.id, 'out');
                      }}
                      style={{
                        background: "#667eea",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        padding: "4px 8px",
                        cursor: "pointer",
                        fontSize: "12px"
                      }}
                    >
                      -
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleScale(item.id, 'in');
                      }}
                      style={{
                        background: "#667eea",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        padding: "4px 8px",
                        cursor: "pointer",
                        fontSize: "12px"
                      }}
                    >
                      +
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRotate(item.id, 'right');
                      }}
                      style={{
                        background: "#667eea",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        padding: "4px 8px",
                        cursor: "pointer",
                        fontSize: "12px"
                      }}
                    >
                      ↻
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Inventory Sidebar - Absolute Overlay */}
        <div style={{ 
          position: "absolute",
          top: "100px",
          right: "0px",
          width: "180px", 
          background: "rgba(255, 255, 255, 0.95)", 
          borderRadius: "15px", 
          padding: "10px",
          boxShadow: "0 0 20px rgba(0,0,0,0.2)",
          overflowY: "auto",
          backdropFilter: "blur(10px)",
          zIndex: 20
        }}>
          <div style={{ marginBottom: "10px" }}>
            <h2 style={{ 
              fontSize: "16px", 
              fontWeight: "700", 
              margin: "0 0 4px 0",
              color: "#2d3748"
            }}>
              📦 Inventory
            </h2>
            <p style={{ 
              fontSize: "11px", 
              color: "#718096", 
              margin: 0 
            }}>
              {inventoryItems.length} items
            </p>
          </div>

          {loading ? (
            <div style={{ 
              textAlign: "center", 
              padding: "15px 0",
              color: "#a0aec0",
              fontSize: "12px"
            }}>
              Loading...
            </div>
          ) : inventoryItems.length === 0 ? (
            <div style={{ 
              textAlign: "center", 
              padding: "15px 0",
              color: "#a0aec0"
            }}>
              <div style={{ fontSize: "24px", marginBottom: "6px" }}>📦</div>
              <div style={{ fontSize: "12px", fontWeight: "500" }}>No items</div>
              <div style={{ fontSize: "10px", opacity: 0.7, marginTop: "2px" }}>
                Buy from shop
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {inventoryItems.map(item => (
                <div 
                  key={item.id} 
                  draggable={isEditing}
                  onDragStart={isEditing ? (e) => handleDragStart(e, item) : undefined}
                  style={{
                    background: "#f8f9fa",
                    borderRadius: "6px",
                    padding: "8px",
                    border: "1px solid #e2e8f0",
                    transition: "all 0.2s ease",
                    cursor: isEditing ? "grab" : "default",
                    opacity: isEditing ? 1 : 0.6
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#ffffff";
                    e.currentTarget.style.borderColor = "#667eea";
                    e.currentTarget.style.transform = "translateX(2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#f8f9fa";
                    e.currentTarget.style.borderColor = "#e2e8f0";
                    e.currentTarget.style.transform = "translateX(0)";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Image
                      src={getFurnitureImagePath(item.item.name)}
                      alt={item.item.name}
                      width={20}
                      height={20}
                      style={{ borderRadius: "3px" }}
                      draggable={false}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: "11px",
                        fontWeight: "600",
                        color: "#2d3748",
                        marginBottom: "1px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis"
                      }}>
                        {item.item.name}
                      </div>
                      <div style={{
                        fontSize: "9px",
                        color: "#718096",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px"
                      }}>
                        {item.item.cost}c
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
