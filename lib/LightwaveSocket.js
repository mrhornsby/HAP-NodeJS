var inherits = require('util').inherits;
var uuid = require('./util/uuid');
var Accessory = require('./Accessory').Accessory;
var Service = require('./Service').Service;
var Characteristic = require('./Characteristic').Characteristic;
var LWRF = require('./util/lightwave.js');

'use strict';

module.exports = {
  LightwaveSocket: LightwaveSocket
};

function LightwaveSocket(displayName, room, device) {

  Accessory.call(this, displayName, uuid.generate('hap-nodejs:accessories:' + room + ':' + device));

  this.getService(Service.AccessoryInformation).
    setCharacteristic(Characteristic.Manufacturer, "Siemens").
    setCharacteristic(Characteristic.Model, "LWRF Socket").
    setCharacteristic(Characteristic.SerialNumber, "JSJSLWxxxxxx")

  this.on('identify', function(paired, callback) {
    LWRF.send(null, room, device, "1", displayName, "Identify", function(msg, rinfo) {
      setTimeout(function() {
        LWRF.send(null, room, device, "0", displayName, "Identify", function(msg, rinfo) {
          callback(null, "0")
        })
      }, 1000)
    })
  })

  var socketService = this.addService(Service.Outlet, displayName);

  socketService.getCharacteristic(Characteristic.On)
    .on('set', function(value, callback) {
      LWRF.send(null, room, device, value? "1" : "0", displayName, value? "On" : "Off", function(msg, rinfo) {
        var err = undefined

        if (!String(msg).match(/[0-9]{3},OK/)) {
          err = String(msg).substring(4)

          console.log("err: " + err)
        }

        callback(err, value)
      })
    })

  socketService.addCharacteristic(LightwaveLock)
    .on('set', function(value, callback) {
      LWRF.send(null, room, device, value == 0? "u" : value == 1? "l" : "k", displayName, value == 0? "Unlock" : value == 1? "Lock" : "Double lock", function(msg, rinfo) {
        var err = undefined

        if (!String(msg).match(/[0-9]{3},OK/)) {
          err = String(msg).substring(4)

          console.log("err: " + err)
        }

        callback(err, value)
      })
    })
}

inherits(LightwaveSocket, Accessory);

LightwaveLock = function() {
  Characteristic.call(this, 'LightwaveRF Device Lock', '19800001-0000-1000-8000-0026BB765291');
  this.setProps({
    format: Characteristic.Formats.UINT8,
    maxValue: 2,
    minValue: 0,
    perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
  });
  this.value = this.getDefaultValue();
};

inherits(LightwaveLock, Characteristic);

// The value property of LeakDetected must be one of the following:
LightwaveLock.UNLOCKED = 0;
LightwaveLock.LOCKED = 1;
LightwaveLock.DOUBLE_LOCKED = 2;
