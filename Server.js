var express = require('express');
var app = new express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var config = require('./config.json');
var crypto = require('crypto');

//Get config.
var port = config.port;
var salt = config.salt;

//Setup
server.listen(port, function(){
	console.log("Server listening on " + port);
});

app.use('/', express.static(__dirname + '/web'));

var total = 0;

io.on('connection', function(socket){

	socket.chatData = {
			nick : "Anonymous",
			trip : "",
			color : colorize(socket.id)
	};

	socket.emit('slist', {
		list: ["Welcome to MyUPlay Chat v0.1",
		       "Type /help for more options",
		       "Warning: This chat is unmoderated."]
	});

	socket.join("global");

	socket.emit('smessage', "Automatically added you to global room.");

	socket.broadcast.emit('join', socket.chatData);

	socket.on('nick', function(data){

		if (data.nick != undefined){
			socket.chatData.nick = data.nick;
		} else {
			socket.emit('smessage', "Requires a new nickname to set it.");
		}

	});

	socket.on('message', function(data){

		if (data.message == undefined){
			socket.emit('smessage', "Message was not included. Try again.");
			return;
		}

		var ret = {
				msg : data.message
		};

		//Copy all values into message.
		for (var i in socket.chatData){
			ret [i] = socket.chatData[i];
		}

		if (data.room == undefined){
			data.room = "global";
		}

		socket.broadcast.to(data.room).emit(ret);

	});

	socket.on('join', function(data){

		if (data.room != undefined){

			socket.join(data.room);

		} else {

			socket.emit('smessage', "Must specify a room to join.");

		}

	});

	socket.on('leave', function(data){

		if (data.room != undefined){

			socket.leave(data.room);

		} else {

			socket.emit('smessage', "Must specify a room to leave.");

		}

	});

	socket.on('tripcode', function(data){

		if (data.code != undefined){
			var code = crypto.createHash('sha');
			code.update(data.code);
			socket.trip = "!" + code.digest('hex').substr(0,8);
		} else {
			console.warn("No code supplied.");
			socket.emit("smessage", "An error seems to have occured.");
		}

	});

	socket.on('stripcode', function(data){

		if (data.code != undefined){
			var hmac = crypto.createHmac('RSA-SHA', salt);
			hmac.update(data.code);
			socket.trip = "!!" + code.digest('hex').substr(0,8);
		} else {
			console.warn("No code supplied.");
			socket.emit("smessage", "An error seems to have occured.");
		}

	});

	socket.on('stats', function(){
		socket.emit('slist', {
			list : ["Total connections (since last restart) - " + total,
			        "More stats coming soon."]
		});
	});

	socket.on('help', function(){
		socket.emit('slist', {
			list : ["/nick - Set username",
			        "/join - Join a room",
			        "/leave - Leave a room",
			        "/tripcode - Set your unique id (keep it secret)",
			        "/stripcode - Secure tripcode (uses a server master key to salt your code)",
			        "/stats - Minor stats about the server.",
			        "If your command is not listed it will be ignored if you try.",
			        "More commands coming soon."]
		});
	});

});

function findClientsSocket(roomId, namespace) {
	var res = []
	, ns = io.of(namespace ||"/");    // the default namespace is "/"

	if (ns) {
		for (var id in ns.connected) {
			if(roomId) {
				var index = ns.connected[id].rooms.indexOf(roomId) ;
				if(index !== -1) {
					res.push(ns.connected[id]);
				}
			} else {
				res.push(ns.connected[id]);
			}
		}
	}
	return res;
}

function getHash(s){
	crypto.createHash('md5');
	crypto.update(s);
	return crypto.digest('hex');
}

function colorize(s){
	var hash = getHash(s);
	return "#" + hash.substr(0,6);
}

if (require.main !== module){
	//Running as a script.
	console.log("This is not meant to be run as a module.");
}
