# 🎨 CanvasSync: Real-Time Collaborative Drawing

A high-performance, multi-user drawing laboratory. This application allows multiple users to draw on a shared canvas simultaneously with real-time cursor tracking and a "selective clear" feature that respects individual work.



---

## 🛠️ Tech Stack & Dependencies

### Backend (Spring Boot)
Add these to your `pom.xml`:
* **Spring WebSocket**: STOMP protocol handling.
* **Spring Data JPA**: Database abstraction.
* **H2 Database**: Fast, in-memory storage for drawing history.
* **Lombok**: Boilerplate reduction for Entities.

### Frontend (React + Vite)
You **must** install these libraries explicitly to support the UI and connectivity:
```bash
# WebSocket & Icons
npm install sockjs-client @stomp/stompjs lucide-react

# Styling (Tailwind CSS)
npm install -D tailwindcss border-color postcss autoprefixer
npx tailwindcss init -p

## 📡 WebSocket API Specification

The application communicates over a STOMP-over-WebSocket connection. 

### Inbound (Client -> Server)
| Destination | Payload | Description |
| :--- | :--- | :--- |
| `/app/draw/sendMessage` | `DrawAction` (JSON) | Sends a single coordinate point and drawing status. |
| `/app/draw/cursorUpdate` | `{userId, x, y, color}` | Broadcasts cursor position for user indicators. |
| `/app/draw/clearMyStuff` | `{userId}` | Requests deletion of all points owned by the user. |

### Outbound (Server -> Client)
| Topic | Payload | Description |
| :--- | :--- | :--- |
| `/topic/public` | `DrawAction` OR `HistoryUpdate` | Broadcasts real-time strokes or redraw commands. |
| `/topic/cursors` | `{userId, x, y, color}` | Updates cursor locations for all connected peers. |

---

## 🏗️ Detailed Logic Flow

### The Drawing Lifecycle
1. **Local Render**: When you move the mouse, the line is drawn instantly to the canvas using a `Ref` to avoid React re-render lag.
2. **Throttled Broadcast**: If the mouse has moved $> 2px$, the coordinate is sent to the Spring Boot server.
3. **Persistence**: The server assigns a unique `id` to the point and saves it to the **H2 Database**.
4. **Synchronization**: The server broadcasts the point (with its new ID) to all other users.
5. **Remote Render**: Other clients receive the point and render it using the `handleRemoteDraw` logic.



---

## 🛠️ Troubleshooting

### 1. "Uncaught ReferenceError: global is not defined"
**Cause**: `sockjs-client` is a legacy library that expects Node.js globals, which Vite doesn't provide.
**Fix**: Ensure the script tag in `index.html` (Mapping `window` to `global`) is placed **above** the main script import.

### 2. Connection Refused (CORS)
**Cause**: The Spring Boot server is rejecting requests from `localhost:5173`.
**Fix**: In `WebSocketConfig.java`, ensure you have:
```java
registry.addEndpoint("/ws-draw")
        .setAllowedOriginPatterns("http://localhost:*")
        .withSockJS();
