// From: https://stackoverflow.com/questions/3780511/reconnection-of-client-when-server-reboots-in-websocket
// Create an instance of WebSocketManager with the WebSocket server URL
class WebSocketManager {
	constructor(url) {
		this.url = url;               // The URL for the WebSocket server
		this.connection = null;        // Will store the WebSocket connection object
		this.reconnectInterval = 5000; // The time interval for reconnecting if the connection is closed
		this.socketConnected = false;  // Tracks whether the socket is connected
	}

	// Start the WebSocket connection
	start() {
		if (this.connection && this.connection.readyState === WebSocket.OPEN) {
			console.log("Already connected!");
			return;
		}

		console.log("Attempting to connect...");
		this.connection = new WebSocket(this.url);

		// Bind the WebSocket event handlers
		this.connection.onopen = this.connectionOpened.bind(this);
		this.connection.onmessage = this.connectionMessage.bind(this);
		this.connection.onclose = this.connectionClosed.bind(this);
		this.connection.onerror = this.connectionError.bind(this);
	}

	// Handler when the WebSocket connection opens
	connectionOpened() {
		console.log("Connection opened");
		this.socketConnected = true; // Update connection status
		this._updateStatus('Connected');
	}

	// Handler when a message is received from the WebSocket
	connectionMessage(event) {
		console.log("Rx:", event.data);
		// You can handle the message data here as needed
	}

	// Handler when the WebSocket connection closes
	connectionClosed() {
		console.log("Connection closed");
		this.socketConnected = false; // Update connection status
		this._updateStatus('Disconnected');
		this.reconnect();
	}

	// Handler when an error occurs in the WebSocket connection
	connectionError(error) {
		console.error("WebSocket Error:", error);
		this._updateStatus('Error');
		this.reconnect();
	}

	// Helper function to update the status of the connection
	_updateStatus(status) {
		window.dispatchEvent(new CustomEvent('connectionStatusChanged', { detail: status }));
	}

	// Attempt to reconnect if the connection is lost
	reconnect() {
		if (this.socketConnected) return; // Prevent reconnect if already connected
		console.log(`Reconnecting in ${this.reconnectInterval / 1000} seconds...`);
		setTimeout(() => this.start(), this.reconnectInterval);
		this.reconnectInterval *= 2; // Exponential backoff
	}

	// Method to check if the WebSocket connection is open
	checkConnection() {
		if (!this.connection || this.connection.readyState === WebSocket.CLOSED) {
			this.start();  // Reopen WebSocket if closed
		}
	}
}
const socketManager = new WebSocketManager('ws://localhost:5424');

// Start the WebSocket connection
document.addEventListener("DOMContentLoaded", () => {
    socketManager.start();  // Initiates the WebSocket connection once the document is loaded

    // Check the connection every 5 seconds
    setInterval(() => socketManager.checkConnection(), 5000);
});// when page loads call eventListener function.

// Function accepts messages from the websocket and checks them here.
// messages arrive out of order so we process them as such.         

function connectionMessage(message) {
    console.log("Rx: " + message.data);

    const data = message.data;

    // Ignore certain message types early on
    if (data.startsWith('#P0 RAN ') || data.startsWith('POW ')) return;
    if (data.startsWith('#P0-P STA sdn')) return; // System power-off notification ignored

    // Define handlers for various message types
    const handlers = {
        'GDS': handleGDS,
        'GSP': handleGSP,
        'GAM list': handleGameList,
        'BSP': handleBallSpeed,
        'SBD': handleScoreboard,
        'GUD info boxer': handleGameText,
        'GUP': handleGameUpdate,
        'GCL': handleGameControlList,
        'INF': handleMachineInfo,
        'UPL status': handleUplinkStatus,
        'UPL check': handleUplinkCheck,
        'UPL add': handleUplinkAdd,
        'CCH': handleControlChange,
        'GST': handleGameStart,
        'TTY': handleRadarStatus,
        'VER': handleVersion,
        'RNP': handleNumberPanels,
        'TSU': handleTargetStatusUpdate,
        'MPI': handleMaintenancePageInfo,
        'MPU': handleMaintenancePageUpdate,
    };

    // Iterate over the handlers and execute the appropriate one
    for (const prefix in handlers) {
        if (data.startsWith(prefix)) {
            handlers[prefix](data);  // Call the relevant handler
            return;  // Return after handling the message
        }
    }
}

// Handle 'GDS' (Game Data Stream) messages
function handleGDS(data) {
	let p = [];
	p["playingAsLogin"] = "";
	p["playingAsFullName"] = "";

	let rest = data.substring(4);
	if(rest == 'x')
	{
		p["fullName"] = "Not logged in";
		p["login"] = "";
		p["type"] = "";
	}
	else {
		let parts = rest.split(" ");

		if(parts.length >= 4) {
			p["login"] = decodeString(parts[0]);
			p["fullName"] = decodeString(parts[2]);
			
			if(p['fullName'] == "anon")
				p['fullName'] = p['login'];
			
			p["type"] = decodeString(parts[3]);
			p["playingAsLogin"] = "";
			p["playingAsFullName"] = "";
			p["userId"] = "0";
			p["nameOfCoach"] = "";

			// playing as:
			if(p["type"] == "Coach")  {
				if(parts.length >= 5)
					p["playingAsLogin"] = decodeString(parts[4]);
				if(p["playingAsLogin"] == "-")
					p["playingAsLogin"] = "";

				if(parts.length >= 6)
					p["playingAsFullName"] = decodeString(parts[5]);
				if(p["playingAsFullName"] == "-")
					p["playingAsFullName"] = "";

				if(parts.length >= 7)
					p["userId"] = parts[6];
			}

			else {
				if(parts.length >= 5)
					p["nameOfCoach"] = decodeString(parts[4]);
				if(p["nameOfCoach"] == "-")
					p["nameOfCoach"] = "";

				if(parts.length >= 6)
					p["userId"] = parts[5];
			}
		}
	}
	set("player", p);
}

// Handle 'GSP' (Game Status) messages
function handleGSP(data) {
    let p = [];
		p["code"] = "x";
		p["spec"] = "";

		let rest = data.substring(4);
		
		let parts = rest.split("-");
		if(parts.length == 1)  {
			let p = [];
			p["code"] = parts[0];
			p["spec"] = "";
		}
		if(parts.length == 2)  {
			let p = [];
			p["code"] = parts[0];
			p["spec"] = parts[1];
		}

		set("game", p);
}

// Handle 'GAM list' (Game List) messages
function handleGameList(data) {
    let rest = data.substring(9);
		let p = [];
		let parts = rest.split(" ");

		for(let i=0; i<parts.length; i++) {
			let code = parts[i].substring(0,4);
			let name = parts[i].substring(4);
			p[code] = decodeString(name);
		}

		set("games", p);
}

// Handle 'BSP' (Ball Speed) messages
function handleBallSpeed(data) {
	let speed = data.substring(4);
		
	let p = [];
	
	p['kph'] = speed;
	set("ballspeed", p);
}

// Handle 'SBD' (Scoreboard) messages
function handleScoreboard(data) {
	let rest = data.substring(4);

	let p = [];
	p["game"] = "";
	for(let i=1; i<9; i++) {
		p["name" + i] = "";
		p["colour" + i] = "";			
	}
	p["nameTime"] = "";
	p["colourTime"] = "";
	p["nameRound"] = "";
	p["colourRound"] = "";
	p["gameDetail"] = "";

	if(rest.charAt(0) == "|")  {
		rest = data.substring(5);

		let sections = rest.split("||");
		if(sections.length >= 1) {
			let scores = sections[0].split("|");

			if(scores.length >= 1)  p["game"] = scores[0];

			for(let i=1; i<9; i++) {
				if(scores.length >= (1+(2*i))) {
					p["name" + i] = scores[(2*i)-1].split("/")[0];
					p["colour" + i] = scores[(2*i)];
				}			
			}
		}
		if(sections.length >= 2) {
			let times = sections[1].split("|");

			if(times.length >= 2) {
				p["nameTime"] = times[0];
				p["colourTime"] = times[1];
			}
			if(times.length >= 4) {
				p["nameRound"] = times[2];
				p["colourRound"] = times[3];
			}
		}
		if(sections.length >= 3) {
			p["gameDetail"] = sections[2];
		}
	}
	set("detail", p);
}

// Handle 'GUD info boxer' (Game Update Information for Boxer)
function handleGameText(data) {
	let rest = data.substring(15);
	let p = [];
	p["text"] = rest;
	set("boxerGameText", p);
}

// Handle 'GUP' (Game Update) messages
function handleGameUpdate(data) {
	let rest = data.substring(4);
	let parts = rest.split(" ");
	let p = [];

	if(parts.length >= 2) {
		let scores = parts[0].split("|");
		p["numScores"] = scores.length;

		for(let i=0; i<8; i++) {
			let value = "";
			if(scores.length > i) value = scores[i];
			p["score"+(i+1)] = value;
		}

		let times = parts[1].split("|");

		p["time"] = times[0];
		if(times.length < 2)
			p["round"] = 0;
		else
			p["round"] = times[1];

		if(parts.length >= 3)
			p["state"] = parts[2];
		else
			p["state"] = "";

		if(parts.length >= 4)
			p["game"] = parts[3];
		else
			p["game"] = "";

		if (parts.length >= 5) {
			let playerAndEvent = parts[4].split('|');
			p["player"] = decodeString(playerAndEvent[0]);
			if (playerAndEvent.length > 1) {
				p["eventName"] = decodeString(playerAndEvent[1]);
			} else {
				p["eventName"] = "";
			}
		}
		else {
			p["player"] = "";
			p["eventName"] = "";
		}

		if(parts.length >= 6)
			p["scoreHistory"] = parts[5];
		else
			p["scoreHistory"] = "";

		set("update", p);
	}	
}

// Handle 'GCL' (Game Control List) messages
function handleGameControlList(data) {
	let rest = data.substring(4);
	let parts = rest.split(" ");
	let p = [];
	for(let i=0; i<parts.length; i++) {
		let pp = [];
		let info = parts[i].split("|");
		if(info.length >= 8) {
			pp["name"] = info[0];
			pp["type"] = info[1];
			pp["value"] = info[2];
			pp["min"] = info[3];
			pp["max"] = info[4];
			pp["step"] = info[5];
			pp["unit"] = info[6];
			pp["shortName"] = info[7];
			p.push(pp);
		}
	}
	set("controls", p);
}

// Handle 'INF' (Machine Info) messages
function handleMachineInfo(data) {
	let rest = data.substring(4);


	// format INF |alias|organisation|machine|orgId
	if(rest.startsWith("|")) {
		let parts = rest.split("|");
		let p = [];

		if(parts.length >= 5) p["orgId"] = decodeString(parts[4]);
		else  p["orgId"] = "";

		if(parts.length >= 4) p["machine"] = decodeString(parts[3]);
		else  p["machine"] = "";

		if(parts.length >= 3) p["organisation"] = decodeString(parts[2]);
		else  p["organisation"] = "";

		if(parts.length >= 2) {
			p["alias"] = decodeString(parts[1]);
			set("info", p);
		}
	}

	else {
		let parts = rest.split(" ");
		let p = [];

		if(parts.length >= 2) p["organisation"] = decodeString(parts[1]);
		else  p["organisation"] = "";

		if(parts.length >= 1) {
			p["alias"] = decodeString(parts[0]);
			set("info", p);
		}
	}
}

// Handle 'UPL status' (Uplink Status) messages
function handleUplinkStatus(data) {
    let rest = data.substring(11);
	let p = [];
	p["status"] = rest;
	set("uplink status", p);
}

// Handle 'UPL check' (Uplink Check) messages
function handleUplinkCheck(data) {
	let rest = data.substring(10);
	let parts = rest.split(" ");
	let p = [];
	if(parts.length >= 2) {
		p["name"] = decodeString(parts[0]);
		p["check"] = parts[1];
		set("uplink check", p);
	}
}

// Handle 'UPL add' (Uplink Add) messages
function handleUplinkAdd(data) {
	let rest = data.substring(8);
	let parts = rest.split(" ");
	let p = [];
	if(parts.length >= 3) {
		p["id"] = parts[0];
		p["name"] = decodeString(parts[1]);
		p["result"] = parts[2];
		set("uplink add", p);
	}
}

// Handle 'CCH' (Control Change) messages
function handleControlChange(data) {
	let rest = data.substring(4);
	let p = [];
	let info = rest.split("|");
	if(info.length >= 7) {
		p["name"] = info[0];
		p["type"] = info[1];
		p["value"] = info[2];
		p["min"] = info[3];
		p["max"] = info[4];
		p["step"] = info[5];
		p["unit"] = info[6];
		set("control", p);
	}
}

// Handle 'GST' (Game Start) messages
function handleGameStart(data) {
	let rest = data.substring(4);
	let p = [];
	let info = rest.split(" ");
	if(info.length >= 2) {
		p["code"] = info[0];
		p["options"] = info[1];
		set("gamestart", p);
	}
}

// Handle 'TTY' (Radar Status) messages
function handleRadarStatus(data) {
	let rest = data.substring(4);
	let p = [];
	p["n"] = rest;
	
	set("radar", p);
}

// Handle 'VER' (Version) messages
function handleVersion(data) {
	let rest = data.substring(6);
	let p = [];
	p["main"] = rest;
	set("version", p);
}

// Handle 'RNP' (Number of Panels) messages
function handleNumberPanels(data) {
	let rest = data.substring(4);
	let p = [];
	p["n"] = rest;
	set("numpanels", p);
	console.log("RNP rx, numpanels = " + rest);
}

// Handle 'TSU' (Target Status Update) messages
function handleTargetStatusUpdate(data) {
	let rest = data.substring(4);
	let commaSeparated = rest.split(",");
	let i;
	let p = [];
	let n = 0;

	for(let i=0; i<commaSeparated.length; i++) {
		let equalSeparated = commaSeparated[i].split("=");
		if(equalSeparated.length == 2) {
			let panel = equalSeparated[0];
			if(equalSeparated[1].length >= 9) {
				let c = equalSeparated[1].charCodeAt(0);
				if((c >= "A".charCodeAt()) && (c <= "D".charCodeAt())) {
					p["panel" + n] = panel;
					p["type" + n] = equalSeparated[1].substring(0,1);
					p["colour" + n] = equalSeparated[1].substring(2,9);
					n++;
				}
			}
			else if(equalSeparated[1].length >= 1) {
				if(equalSeparated[1].startsWith("P")) {
					p["panel" + n] = panel;
					p["type" + n] = equalSeparated[1].substring(0,1);
					p["colour" + n] = "P";
					n++;
				}
			}
		}
	}

	p["n"] = n;
	set("panelupdate", p);
}

// Handle 'MPI' (Maintenance Page Info) messages
function handleMaintenancePageInfo(data) {
	let rest = data.substring(4);
	let spaceSeparated = rest.split(" ");
	let n = spaceSeparated.length;
	let p = [];
	if(n > 0)  p["machineName"] = decodeString(spaceSeparated[0]);
	if(n > 1)  p["machineAlias"] = decodeString(spaceSeparated[1]);
	if(n > 2)  p["orgName"] = decodeString(spaceSeparated[2]);
	if(n > 3)  p["swVersion"] = decodeString(spaceSeparated[3]);
	if(n > 4)  p["lastRefresh"] = decodeString(spaceSeparated[4]);
	if(n > 5)  p["cpuTemp"] = spaceSeparated[5];
	if(n > 6)  p["piType"] = decodeString(spaceSeparated[6]);
	if(n > 7)  p["numUsers"] = spaceSeparated[7];
	set("maintenanceInfoUpdate", p);
}

// Handle 'MPU' (Maintenance Page Update) messages
function handleMaintenancePageUpdate(data) {
	let rest = data.substring(4);
	let spaceSeparated = rest.split(" ");
	let n = spaceSeparated.length;
	let p = [];
	if((n > 1) && (spaceSeparated[0] == "userlist")) {
		p["type"] = "userlist";
		if(spaceSeparated[1] == "write") {
			if((n == 3) && (spaceSeparated[2] == "finished"))  p["message"] = "write finished";
			else if(n == 5) {
				p["message"] = "write progress";
				p["progress"] = spaceSeparated[2];
				p["total"] = spaceSeparated[4];
			}
			else {
				console.log("userList write with " + n + " parameters");
			}
		}
		else if(spaceSeparated[1] == "requested")  p["message"] == "requested";

		console.log("userlistInfoUpdate: " + p["type"] + " " + p["message"]);
		set("userlistInfoUpdate", p);
	}
}

// format string that was sent over websocket.
// Using regex to replace all _X values with true punctuation. 
//
function decodeString(text) {
	text = text.replace(/_C/g, ",");
	text = text.replace(/_S/g, " ");
	text = text.replace(/_U/g, "_");
	return text;
}

// format string that is due to be sent over websocket.
// Using regex to replace all commas with _C, all spaces with _S and all underscores with _U  
// 
function encodeString(text) {
	text = text.replace(/_/g, "_U");
	text = text.replace(/\s/g, "_S");
	text = text.replace(/,/g, "_C");
	return text;
}

/* ************** WEBSOCKET SENDING MESSAGES  ************** */

function connectionGetDeviceStatus(deviceId) {
	send("GDS " + deviceId);
}

function connectionGetPanels()
{
	send("RNP");
}

function connectionGetOrganisation(deviceId) {
	send("INF " + deviceId);
}

function resetGamesBackToDefault()
{
	send("GBL ResetAllGamesToDefaults");
}

function connectionGetUserList(deviceId, user) {
	let message = "GUL";
	if(user != "")
		message += " " + user;
	message += "limit-leet";
	send(message);
}

function connectionSearchUserList(deviceId, search) {
	let message = "GULS";
	
	if(search.length == 0 && is_coach)
		return getUserListForCoach(logged_in_user);
	
	if(search.length == 0)
		return connectionGetUserList(deviceId, logged_in_user);

	message += " " + search;
	send(message);
}

function connectionGetGameList() {
	send("GAM list");
}

function connectionGetRadar(){
	send("TTY");
}

function connectionGetGameSpec(deviceId) {
	send("GSP " + deviceId);
}

function connectionSetGameSpec(deviceID, code, spec) {
	send("GSP " + deviceID + " " + code + "-" + spec);
}

function connectionGetScoreDetail(code) {
	if(code === undefined)  send("SBD");
	else  send("SBD " + code);
}

function isInt(value) {
  return !isNaN(value) && (function(x) { return (x | 0) === x; })(parseFloat(value))
}

function connectionGameStart(code, spec, user)
{
	console.log("===========================================STARTING GAME AS USER:" +user);
	let msg = "p";
	
	if( isInt( user ) )
		msg = "u";
	
	send("GST " + code + " " + spec + ","+msg + encodeString(user));
}

function connectionGameStartLast() {
	send("GST LAST");
}

function connectionGameStop() {
	send("GST");
}

function connectionGetControlList(code) {
	send("GCL " + code);
}

function connectionChangeControl(name, change) {
	send("CCH " + encodeString(name) + " " + change);
}

function connectionSetGame(code) {
	send("GAM " + code);
}

function connectionGetGatewayStatus() {
	send("UPL status");
}

function connectionGatewayCheckUserName(name) {
	send("UPL check " + encodeString(name));
}

function connectionGatewayAddUser(deviceId, string) {
	send("UPL add " + deviceId + " " + string);
}

function connectionSetControl(deviceId, code, name, value) {
	send("CON " + deviceId + " " + code + " " + name + " " + value);
}

function connectionGetVersion() {
	send("VER");
}

function connectionGetNumberOfPanels() {
	send("RNP");
}

function connectionChangeTargetPosition(from, to) {
	send("TGT move " + from + " " + to);
}

function connectionPendingTargetPosition(from, to) {
	send("TGT move pending " + from + " " + to);
}

function connectionGetTargetInfo() {
	send("TSU");
}

function connectionGetMaintenanceInfo() {
	send("MPI");
}

function connectionForceUserListUpdate() {
	send("UPL forceUserListUpdate");
}

function connectionRestartFirmware() {
	send("POW restart");
}

// called in settings by the poweroff button.
function connectionShutdown() {
	send("POW ShutDown");
	alert("Machine has been shutdown.");
}

// function to send a message over the websocket. Also writes to console log.
// Handles if the connection is not present.
// 
function send(string) {
    console.log("Tx: " + string);
    if (socketManager.connection && socketManager.connection.readyState === WebSocket.OPEN) {
        socketManager.connection.send(string);
    } else {
        console.error("WebSocket is not open or connection is undefined, unable to send message.");
    }
}
