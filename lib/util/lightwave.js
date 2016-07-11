var dgram = require('dgram')

module.exports = {
  init: init,
  send: send,
  getVersion: getVersion,
  getSerial: getSerial,
  getEnergy: getEnergy
}

var sequenceNumber = 100;
var callbacks = [];
var version = "Unknown"
var serial = "Unknown"
var energy = "Unknown"

var server = dgram.createSocket("udp4");

var queue = [];

function getVersion() {
  return version
}

function getSerial() {
  return serial
}

function getEnergy() {
  return energy
}

server.on("error", function (err) {
  console.warn("server error:\n" + err.stack);
  server.close();
});

server.on("message", function (msg, rinfo) {
  var str = String(msg)

  if (str.charAt(0) == '*') {
    var obj = JSON.parse(str.substring(2))

    if (obj.type == 'hub') {
      version = obj.fw
      serial = obj.mac
    } else if (obj.type == 'energy') {
      energy = obj.cUse
    }
  } else {
    var recvSequenceNumber = 'S' + String(msg).substring(0, 3)

    var callback = false

    if (callbacks[recvSequenceNumber]) {
      callbacks[recvSequenceNumber](msg, rinfo)
      delete callbacks[recvSequenceNumber]
      callback = true
    }
  }

  console.log("recv: " + String(msg).replace('\n', '') + " (callback=" + callback + ")")
});

server.on("listening", function () {
  server.setBroadcast(true);
});

server.bind(9761);

function init(callback) {
  send("@H", "", "", "", "Retrieving", "Version", null)
}

function send(command, room, device, func, line1, line2, callback) {
  for (i = 0; i < queue.length; i++) {
    if (queue[i].room == command.room && queue[i].device == command.device) {
      queue.splice(i, 1);
    }
  }

  queue.push({command: command, room: room, device: device, func: func, line1: line1, line2: line2, callback: callback});
}

function sendFromQueue() {
  var command = queue.shift();

  if (command) {
    var buffer = new Buffer(sequenceNumber + "," +
      (command.command? command.command : "!") +
      (command.room? "R" + command.room : "") +
      (command.device? "D" + command.device : "") +
      (command.func? "F" + command.func : "") +
      "|" + (command.line1? command.line1 : "") +
      "|" + (command.line2? command.line2 : "") +
      "\n");

    if (command.callback) {
      callbacks[String('S' + sequenceNumber)] = command.callback;
    }

    if( sequenceNumber++ == 1000) {
      sequenceNumber = 100;
    }

    console.log("send: " + buffer.toString().replace('\n', ''));

    server.send(buffer, 0, buffer.length, 9760, "255.255.255.255", function(err, bytes) {
      if (err) {
        console.error(err);
      }
    });
  }
}

setInterval(sendFromQueue, 250);