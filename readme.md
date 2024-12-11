# WebSocket  

This project demonstrates the use of WebSockets by providing a simple setup for server-client communication, including a refactored WebSocket connection logic.  

## Features  
1. **Server for WebSocket Communication**  
   - `server.js` serves as the WebSocket server to manage connections and handle messages.  

2. **Interactive Interface**  
   - `index.html` provides a browser-based interface to test and interact with the WebSocket server.  

3. **Refactored WebSocket Logic**  
   - Improvements made in `socket.js`:  
     - Encapsulated connection logic within a `WebSocketManager` class for modularity and scalability.  
     - Simplified the `connectionMessage` function to focus solely on message handling, removing unnecessary complexity.  
     - Replaced `var` declarations with `let` to reduce variable scope and improve readability.  

## Prerequisites  
- [Node.js](https://nodejs.org) installed on your machine.  

## How to Run  
1. Install dependencies:  
   ```bash  
   npm install  
2. Run server 
    ```bash
    node server.js
3. Run index.html in the web browser