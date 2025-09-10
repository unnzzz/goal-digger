"use client";
import { useEffect, useState, useRef } from "react";
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
  zIndex: number;
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
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(true);
  const [zIndexCounter, setZIndexCounter] = useState(10);
  const [userName, setUserName] = useState<string>("");
  const roomRef = useRef<HTMLDivElement>(null);
  const { showMessage } = useAvatar();

  const load = async () => {
    setLoading(true);
    
    // Fetch user name
    try {
      const userResponse = await fetch("/api/auth/session");
      const userData = await userResponse.json();
      if (userData?.user?.name) {
        setUserName(userData.user.name);
      }
    } catch (error) {
      console.error("Error fetching user name:", error);
    }
    
    const r = await fetch("/api/room/inventory", { cache: "no-store" });
    const j = await r.json();
    // Add default rotation, scale, and zIndex values
    const itemsWithDefaults = (j.items ?? []).map((item: Owned, index: number) => ({
      ...item,
      rotation: item.rotation || 0,
      scale: item.scale || 1,
      zIndex: item.zIndex || (10 + index)
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
        zIndex: 5, // Behind other items by default
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
    const path = `/furniture/${cleanName}.png`;
    console.log(`Image path for "${itemName}": ${path}`);
    return path;
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, item: Owned) => {
    setDraggedItem(item);
    setDragOffset({ x: 0, y: 0 }); // For inventory items, no offset needed
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
    const x = e.clientX - rect.left - (dragOffset?.x || 0);
    const y = e.clientY - rect.top - (dragOffset?.y || 0);

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
        itemId: draggedItem.item.id, // Use ShopItem.id, not UserItem.id
        posX: x,
        posY: y,
        placed: true
      })
    });

    // Show instant avatar message for room decoration
    showMessage(getMessageForAction('room_decorated'), true);

    setDraggedItem(null);
    setDragOffset(null);
  };

  const handleItemDragStart = (e: React.DragEvent, item: Owned) => {
    setDraggedItem(item);
    
    // Calculate offset from mouse position to item's current position
    const rect = roomRef.current?.getBoundingClientRect();
    if (rect) {
      const offsetX = e.clientX - rect.left - (item.posX || 0);
      const offsetY = e.clientY - rect.top - (item.posY || 0);
      setDragOffset({ x: offsetX, y: offsetY });
    } else {
      setDragOffset({ x: 0, y: 0 });
    }
    
    e.dataTransfer.effectAllowed = "move";
  };

  const handleItemDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedItem || !roomRef.current) return;

    const rect = roomRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - (dragOffset?.x || 0);
    const y = e.clientY - rect.top - (dragOffset?.y || 0);

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
        itemId: draggedItem.item.id, // Use ShopItem.id, not UserItem.id
        posX: x,
        posY: y,
        placed: true
      })
    });

    setDraggedItem(null);
    setDragOffset(null);
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

    // Only save to server if it's not the default table
    if (itemId !== "default-table") {
      const item = updatedItems.find(i => i.id === itemId);
      if (item) {
        await fetch("/api/room/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            itemId: item.item.id, // Use ShopItem.id, not UserItem.id
            rotation: item.rotation
          })
        });
      }
    }
  };

  const handleScale = async (itemId: string, direction: 'in' | 'out') => {
    const scaleDelta = direction === 'in' ? 0.1 : -0.1;
    const updatedItems = items.map(item => 
      item.id === itemId 
        ? { ...item, scale: Math.max(0.3, Math.min(10, item.scale + scaleDelta)) }
        : item
    );
    setItems(updatedItems);

    // Only save to server if it's not the default table
    if (itemId !== "default-table") {
      const item = updatedItems.find(i => i.id === itemId);
      if (item) {
        await fetch("/api/room/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            itemId: item.item.id, // Use ShopItem.id, not UserItem.id
            scale: item.scale
          })
        });
      }
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

  const handleBringToFront = (itemId: string) => {
    const newZIndex = zIndexCounter + 1;
    setZIndexCounter(newZIndex);
    
    const updatedItems = items.map(item => 
      item.id === itemId 
        ? { ...item, zIndex: newZIndex }
        : item
    );
    setItems(updatedItems);
  };

  const handleSendToBack = (itemId: string) => {
    const newZIndex = Math.max(1, zIndexCounter - 1);
    setZIndexCounter(newZIndex);
    
    const updatedItems = items.map(item => 
      item.id === itemId 
        ? { ...item, zIndex: newZIndex }
        : item
    );
    setItems(updatedItems);
  };

  const handleSendToInventory = async (itemId: string) => {
    // Check if this is the default table (not in database)
    if (itemId === "default-table") {
      // For default table, just mark it as not placed instead of removing it
      const updatedItems = items.map(item => 
        item.id === itemId 
          ? { ...item, placed: false, posX: null, posY: null }
          : item
      );
      setItems(updatedItems);
      setSelectedItem(null);
      return;
    }

    // Update item to not be placed
    const updatedItems = items.map(item => 
      item.id === itemId 
        ? { ...item, placed: false, posX: null, posY: null }
        : item
    );
    setItems(updatedItems);

    // Save to server
    const item = items.find(i => i.id === itemId);
    if (item) {
      await fetch("/api/room/place", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: item.item.id, // Use ShopItem.id, not UserItem.id
          posX: null,
          posY: null,
          placed: false
        })
      });
    }

    // Deselect the item
    setSelectedItem(null);
    
    // Show avatar message
    showMessage(getMessageForAction('room_decorated'), true);
  };

  const placedItems = items.filter(item => item.placed).sort((a, b) => a.zIndex - b.zIndex);
  const inventoryItems = items.filter(item => !item.placed);

  return (
    <AppLayout activePage="room">
      <div 
        className="room-page-container"
        style={{ 
          display: "flex", 
          height: "calc(100vh - 80px)", 
          gap: "0px", 
          padding: "0px",
          background: "transparent"
        }}
        onClick={() => setSelectedItem(null)}
      >
        {/* Central Room View - ENTIRE PAGE */}
        <div className="room-container" style={{ 
          flex: 1, 
          background: "transparent", 
          borderRadius: "20px", 
          padding: "0px",
          position: "relative",
          overflow: "visible",
          boxShadow: "none",
          minWidth: "100%",
          height: "100%",
          marginLeft: "20px",
          marginTop: "20px",
          display: "flex",
          flexDirection: "column"
        }}>
          {/* Room Title - Above Picture */}
          <div className="room-title" style={{ 
            textAlign: "center", 
            color: "#2d3748",
            marginBottom: "10px",
            background: "#ffffff",
            padding: "20px",
            borderRadius: "15px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
            border: "1px solid #e2e8f0"
          }}>
            <h1 style={{ 
              fontSize: "24px", 
              fontWeight: "700", 
              margin: "0 0 8px 0",
              background: "linear-gradient(45deg, #667eea, #764ba2)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}>
              {userName ? `${userName}'s Room` : "Your Room"}
            </h1>
            <p style={{ 
              fontSize: "14px", 
              opacity: 0.7, 
              margin: "0 0 15px 0" 
            }}>
              Decorate your space with furniture you've earned • Drag, drop, resize, and rotate furniture to design your perfect room
            </p>
            
            {/* Save/Edit Room Buttons */}
            <div className="room-buttons" style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              {isEditing ? (
                <button
                  onClick={handleSaveRoom}
                  className="btn"
                  style={{
                    padding: "12px 24px",
                    fontSize: "16px",
                    fontWeight: "700",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px"
                  }}
                >
                  Save Room
                </button>
              ) : (
                <button
                  onClick={handleEditRoom}
                  className="btn"
                  style={{
                    padding: "12px 24px",
                    fontSize: "16px",
                    fontWeight: "700",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px"
                  }}
                >
                  Edit Room
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
            onClick={(e) => {
              // Only deselect if clicking on the room background, not on furniture
              if (e.target === e.currentTarget) {
                setSelectedItem(null);
              }
            }}
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
                  zIndex: selectedItem === item.id ? 100 : item.zIndex,
                  border: selectedItem === item.id && isEditing ? "2px solid #667eea" : "none",
                  borderRadius: "8px",
                  padding: "4px"
                }}
                onClick={isEditing ? (e) => {
                  e.stopPropagation();
                  handleItemClick(item.id);
                } : undefined}
              >
                <img
                  src={getFurnitureImagePath(item.item.name)}
                  alt={item.item.name}
                  width={60 * item.scale}
                  height={60 * item.scale}
                  draggable={false}
                  style={{ display: 'block' }}
                />
                
                {/* Controls for selected item - only in editing mode */}
                {selectedItem === item.id && isEditing && (
                  <div style={{
                    position: "absolute",
                    top: "50%",
                    left: "100%",
                    transform: "translateY(-50%)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                    background: "rgba(0, 0, 0, 0.9)",
                    padding: "8px",
                    borderRadius: "8px",
                    zIndex: 200,
                    marginLeft: "10px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
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
                        padding: "6px 8px",
                        cursor: "pointer",
                        fontSize: "12px",
                        minWidth: "32px",
                        height: "32px"
                      }}
                      title="Rotate Left"
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
                        padding: "6px 8px",
                        cursor: "pointer",
                        fontSize: "12px",
                        minWidth: "32px",
                        height: "32px"
                      }}
                      title="Make Smaller"
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
                        padding: "6px 8px",
                        cursor: "pointer",
                        fontSize: "12px",
                        minWidth: "32px",
                        height: "32px"
                      }}
                      title="Make Bigger"
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
                        padding: "6px 8px",
                        cursor: "pointer",
                        fontSize: "12px",
                        minWidth: "32px",
                        height: "32px"
                      }}
                      title="Rotate Right"
                    >
                      ↻
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBringToFront(item.id);
                      }}
                      style={{
                        background: "#48bb78",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        padding: "6px 8px",
                        cursor: "pointer",
                        fontSize: "12px",
                        minWidth: "32px",
                        height: "32px"
                      }}
                      title="Bring to Front"
                    >
                      ⬆️
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSendToBack(item.id);
                      }}
                      style={{
                        background: "#ed8936",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        padding: "6px 8px",
                        cursor: "pointer",
                        fontSize: "12px",
                        minWidth: "32px",
                        height: "32px"
                      }}
                      title="Send to Back"
                    >
                      ⬇️
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSendToInventory(item.id);
                      }}
                      style={{
                        background: "#e53e3e",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        padding: "6px 8px",
                        cursor: "pointer",
                        fontSize: "12px",
                        minWidth: "32px",
                        height: "32px"
                      }}
                      title="Send to Inventory"
                    >
                      📦
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Inventory Section - Below Room */}
        <div className="inventory-section" style={{ 
          width: "100%",
          background: "rgba(255, 255, 255, 0.95)", 
          borderRadius: "15px", 
          padding: "16px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
          backdropFilter: "blur(10px)",
          marginTop: "20px"
        }}>
          <div style={{ marginBottom: "10px" }}>
            <h2 style={{ 
              fontSize: "18px", 
              fontWeight: "700", 
              margin: "0 0 4px 0",
              background: "linear-gradient(45deg, #667eea, #764ba2)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}>
              📦 Inventory
            </h2>
            <p style={{ 
              fontSize: "12px", 
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
            <div className="inventory-carousel" style={{ 
              display: "flex", 
              flexDirection: "row", 
              gap: "12px",
              overflowX: "auto",
              padding: "8px 0",
              scrollbarWidth: "thin",
              scrollbarColor: "#8B5CF6 #f1f1f1"
            }}>
              {inventoryItems.map(item => (
                <div 
                  key={item.id} 
                  draggable={isEditing}
                  onDragStart={isEditing ? (e) => handleDragStart(e, item) : undefined}
                  style={{
                    background: "#f8f9fa",
                    borderRadius: "8px",
                    padding: "12px",
                    border: "1px solid #e2e8f0",
                    transition: "all 0.2s ease",
                    cursor: isEditing ? "grab" : "default",
                    opacity: isEditing ? 1 : 0.6,
                    minWidth: "120px",
                    flexShrink: 0,
                    textAlign: "center"
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
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                    <img
                      src={getFurnitureImagePath(item.item.name)}
                      alt={item.item.name}
                      width={40}
                      height={40}
                      style={{ borderRadius: "6px", display: 'block' }}
                      draggable={false}
                    />
                    <div style={{ width: "100%" }}>
                      <div style={{
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#2d3748",
                        marginBottom: "4px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis"
                      }}>
                        {item.item.name}
                      </div>
                      <div style={{
                        fontSize: "10px",
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
