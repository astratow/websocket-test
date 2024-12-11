const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 5424 });

wss.on('connection', (ws) => {
  console.log('A client has connected.');

  // Send a message to the client
  ws.send('Welcome to the WebSocket server!');

  // Handle messages from the client
  ws.on('message', (message) => {
    console.log('Received from client: ' + message);
    // Send a response back to the client
    ws.send('Server received: ' + message);
  });

  // Handle the WebSocket closing
  ws.on('close', () => {
    console.log('A client has disconnected.');
  });
});

console.log('WebSocket server running on ws://localhost:5424');

