// From: https://stackoverflow.com/questions/3780511/reconnection-of-client-when-server-reboots-in-websocket
document.addEventListener("DOMContentLoaded", eventListener); // when page loads call eventListener function.


var connection;
const server = "uk";

/* create websocket connection, assign handler functions.
 * start() makes the connection object.
 * check() checks the connection on close - and reopens it.
*/
function eventListener() {
  'use strict';

  function start() {
	connection = new WebSocket('ws://localhost:5424');
	// connection = new WebSocket('ws://' + window.location.hostname + ':5424');
	connection.onopen = connectionOpened;
	connection.onmessage = connectionMessage;
	connection.onclose = function(){
		check();
	};
  }

  function check() {
    if(!connection || connection.readyState == 3) start();
  }

  start();
  setInterval(check, 5000);
}

/* Function called when websocket connection is established. */
function connectionOpened() {
	console.log("Connection opened");
	setTimeout(connectionKeepAlive, 4000);
	socketConnected();
//	document.getElementById("userList").innerHTML = "";
}

/* Keep the websocket connection alive with a periodic ping command. */
function connectionKeepAlive()
{	
	if( connection.readyState !== WebSocket.OPEN )
		return;
	connection.send('PNG');
	setTimeout(connectionKeepAlive, 4000);
}

/* Function accepts messages from the websocket and checks them here.
 * messages arrive out of order so we process them as such.        
*/ 
function connectionMessage(message)
{	
	// output message.
	console.log( "Rx: " +message.data );


	if( message.data.startsWith( '#P0 RAN ' ) )
		return;

	// notify GUI when system has powered off.
	// problem with this is that it can not be hidden on power up.
	if( message.data.startsWith( '#P0-P STA sdn' ) ){
		// alert("This machine has powered off.");
		return;
	}

	// notify the GUI when the system has powered off
	// perhaps if we want to do this use js and replace a visible html element?
	/*
	if( message.data.startsWith( '#P0-P STA sdn' ) ){
		var w = window.open('','','width=100,height=100');
		w.document.write('This machine has powered off.');
		w.focus();
		setTimeout(function() {w.close();}, 5000);
		// alert("This machine has powered off.");
		return;
	}*/

	// ignore power related commands.
	if( message.data.startsWith( 'POW ' ) )
		return;

	// Get Device Status - the device interfacing with the ICON.
	if( message.data.startsWith( "GDS " ) )
	{
		var p = [];
		p["playingAsLogin"] = "";
		p["playingAsFullName"] = "";

		var rest = message.data.substring(4);
		if(rest == 'x')
		{
			p["fullName"] = "Not logged in";
			p["login"] = "";
			p["type"] = "";
		}
		else {
			var parts = rest.split(" ");

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


	/*else if(message.data.startsWith("GUL ")) {
// example of GUL reply:
// GUL 2 0|anon BROWNE_SGeoff 1|Superuser geoff cd7dc323daa4694f273b1cab2a935f38266ea782

		var rest = message.data.substring(4);
		var parts = rest.split(" ");
		
		var p = [];

		if(parts.length > 5) {
			p["fullName"] = parts[2];
			p["type"] = parts[3].substr(2);
			p["login"] = parts[4];
			p["password"] = parts[5];
		}

		else  {
			p["fullName"] = rest;
			p["type"] = "";
			p["login"] = "";
			p["password"] = "";
		}

		set("users", p);
	}*/

	// Game SPec - Obtain info about currently selected game.
	else if(message.data.startsWith("GSP ")) {
		// Get Game Spec
		var p = [];
		p["code"] = "x";
		p["spec"] = "";

		var rest = message.data.substring(4);
		
		var parts = rest.split("-");
		if(parts.length == 1)  {
			var p = [];
			p["code"] = parts[0];
			p["spec"] = "";
		}
		if(parts.length == 2)  {
			var p = [];
			p["code"] = parts[0];
			p["spec"] = parts[1];
		}

		set("game", p);
	}

	// a returned list of installed game codes.
	else if(message.data.startsWith("GAM list")) {
		// Game list
		var rest = message.data.substring(9);
		var p = [];
		var parts = rest.split(" ");

		for(i=0; i<parts.length; i++) {
			var code = parts[i].substring(0,4);
			var name = parts[i].substring(4);
			p[code] = decodeString(name);
		}

		set("games", p);
	}
	
	// ball speed ? - not in FTS-DOC-004!
	else if(message.data.startsWith("BSP ")){
		var speed = message.data.substring(4);
		
		var p = [];
		
		p['kph'] = speed;
		set("ballspeed", p);
	}

	// request ScoreBoarD info.
	else if(message.data.startsWith("SBD ")) {
		var rest = message.data.substring(4);

		var p = [];
		p["game"] = "";
		for(i=1; i<9; i++) {
			p["name" + i] = "";
			p["colour" + i] = "";			
		}
		p["nameTime"] = "";
		p["colourTime"] = "";
		p["nameRound"] = "";
		p["colourRound"] = "";
		p["gameDetail"] = "";

		if(rest.charAt(0) == "|")  {
			rest = message.data.substring(5);

			var sections = rest.split("||");
			if(sections.length >= 1) {
				var scores = sections[0].split("|");

				if(scores.length >= 1)  p["game"] = scores[0];

				for(i=1; i<9; i++) {
					if(scores.length >= (1+(2*i))) {
						p["name" + i] = scores[(2*i)-1].split("/")[0];
						p["colour" + i] = scores[(2*i)];
					}			
				}
			}
			if(sections.length >= 2) {
				var times = sections[1].split("|");

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

	// ? - not in FTS-DOC-004!
	else if(message.data.startsWith("GUD info boxer ")) {
		var rest = message.data.substring(15);
		var p = [];
		p["text"] = rest;
		set("boxerGameText", p);
	}

	// Game UPdate - most recent infomation about current game.
	else if(message.data.startsWith("GUP ")) {
		var rest = message.data.substring(4);
		var parts = rest.split(" ");
		var p = [];

		if(parts.length >= 2) {
			var scores = parts[0].split("|");
			p["numScores"] = scores.length;

			for(i=0; i<8; i++) {
				var value = "";
				if(scores.length > i) value = scores[i];
				p["score"+(i+1)] = value;
			}

			var times = parts[1].split("|");

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
				var playerAndEvent = parts[4].split('|');
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

	// ? - not in FTS-DOC-004!
	else if(message.data.startsWith("GCL ")) {
		var rest = message.data.substring(4);
		var parts = rest.split(" ");
		var p = [];
		for(i=0; i<parts.length; i++) {
			var pp = [];
			var info = parts[i].split("|");
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

	// INFormation about machine:- alias, organisation etc.
	else if(message.data.startsWith("INF ")) {
		var rest = message.data.substring(4);
		//if(message.data.length < 5)  return;


		// format INF |alias|organisation|machine|orgId
		if(rest.startsWith("|")) {
			var parts = rest.split("|");
			var p = [];

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
			var parts = rest.split(" ");
			var p = [];

			if(parts.length >= 2) p["organisation"] = decodeString(parts[1]);
			else  p["organisation"] = "";

			if(parts.length >= 1) {
				p["alias"] = decodeString(parts[0]);
				set("info", p);
			}
		}
	}

	// UPLoad userlist status
	else if(message.data.startsWith("UPL status "))
	{
		var rest = message.data.substring(11);
		var p = [];
		p["status"] = rest;
		set("uplink status", p);
	}
	// UPLoad userlist check for updates
	else if(message.data.startsWith("UPL check "))
	{
		var rest = message.data.substring(10);
		var parts = rest.split(" ");
		var p = [];
		if(parts.length >= 2) {
			p["name"] = decodeString(parts[0]);
			p["check"] = parts[1];
			set("uplink check", p);
		}
	}
	// UPLoad userlist add ? 
	else if(message.data.startsWith("UPL add "))
	{
		var rest = message.data.substring(8);
		var parts = rest.split(" ");
		var p = [];
		if(parts.length >= 3) {
			p["id"] = parts[0];
			p["name"] = decodeString(parts[1]);
			p["result"] = parts[2];
			set("uplink add", p);
		}
	}

	// ? - not in FTS-DOC-004!
	else if(message.data.startsWith("CCH ")) {
		var rest = message.data.substring(4);
		var p = [];
		var info = rest.split("|");
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

	// Game STart
	else if(message.data.startsWith("GST ")) {
		var rest = message.data.substring(4);
		var p = [];
		var info = rest.split(" ");
		if(info.length >= 2) {
			p["code"] = info[0];
			p["options"] = info[1];
			set("gamestart", p);
		}
	}

	// is radar connected? TTY yes/no.
	else if( message.data.startsWith("TTY " ) )
	{
		var rest = message.data.substring(4);
		var p = [];
		p["n"] = rest;
		
		set("radar", p);
	}

	// software VERsion
	else if(message.data.startsWith("VER ")) {
		var rest = message.data.substring(6);
		var p = [];
		p["main"] = rest;
		set("version", p);
	}

	// Request Numner of Panels.
	else if(message.data.startsWith("RNP ")) {
		var rest = message.data.substring(4);
		var p = [];
		p["n"] = rest;
		set("numpanels", p);
		console.log("RNP rx, numpanels = " + rest);
	}

	// Target Status Update - update panel target colours.
	else if(message.data.startsWith("TSU ")) {
		var rest = message.data.substring(4);
		var commaSeparated = rest.split(",");
		var i;
		var p = [];
		var n = 0;

		for(i=0; i<commaSeparated.length; i++) {
			var equalSeparated = commaSeparated[i].split("=");
			if(equalSeparated.length == 2) {
				var panel = equalSeparated[0];
				if(equalSeparated[1].length >= 9) {
					var c = equalSeparated[1].charCodeAt(0);
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

	// Maintenance Page Info - info to populate page.
	else if(message.data.startsWith("MPI ")) {
		var rest = message.data.substring(4);
		var spaceSeparated = rest.split(" ");
		var n = spaceSeparated.length;
		var p = [];
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

	// Maintenance Page Update - updated info to populate page.
	else if(message.data.startsWith("MPU ")) {
		var rest = message.data.substring(4);
		var spaceSeparated = rest.split(" ");
		var n = spaceSeparated.length;
		var p = [];
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
}

/* format string that was sent over websocket.
 * Using regex to replace all _X values with true punctuation. 
*/ 
function decodeString(text) {
	text = text.replace(/_C/g, ",");
	text = text.replace(/_S/g, " ");
	text = text.replace(/_U/g, "_");
	return text;
}

/* format string that is due to be sent over websocket.
 * Using regex to replace all commas with _C, all spaces with _S and all underscores with _U 
*/ 
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
	var message = "GUL";
	if(user != "")
		message += " " + user;
	message += "limit-leet";
	send(message);
}

function connectionSearchUserList(deviceId, search) {
	var message = "GULS";
	
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
	var msg = "p";
	
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


/* function to send a message over the websocket. Also writes to console log.
 * Handles if the connection is not present.
*/
function send(string) {
	console.log("Tx: " + string);
	
	if( connection.readyState !== WebSocket.OPEN )
		return;
	connection.send(string);
}

