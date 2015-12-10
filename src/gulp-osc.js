(function() {

  "use strict;"

  var gulp   = require('gulp'),
      th2    = require('through2');

  var fs   = require('fs'),
      path = require('path');

  var gutil   = require('gulp-util'),
      cyan    = gutil.colors.cyan,
      magenta = gutil.colors.magenta;

  var osc = require('oscsocket');

  var EventEmitter = require('events').EventEmitter;

  // ------- LOGGER -----------------------------------------------------------------

  var PLUGIN_NAME = "gulp-osc";

  function log( message ) {
    gutil.log( gutil.colors.magenta(PLUGIN_NAME), message);
  }

  function warn(message) {
    log(gutil.colors.red('WARNING') + ' ' + message);
  }

  function error(message) {
    return new gutil.PluginError( PLUGIN_NAME, message );
  }

  function sendLog( msg, sendAddr, sendPort ){
    gutil.log(
      gutil.colors.magenta(PLUGIN_NAME),
      gutil.colors.green(msg.toString()),
      "->",
      gutil.colors.cyan(sendAddr+":"+sendPort)
    );
  }

  function receiveLog( msg ){
    gutil.log(
      gutil.colors.magenta(PLUGIN_NAME),
      gutil.colors.cyan(msg.srcAddress+":"+msg.srcPort),
      "->",
      gutil.colors.green(msg.type+" "+msg.values.join(" "))
    );
  }

  // ------- EXPORTS ----------------------------------------------------------------

  var sock = new osc.OSCSocket();
  var sockHash = {};

  var GulpOSC = module.exports = function( message, sendAddr, sendPort ){

    function transform( file, encoding, callback ){
      callback();
    }

    function flush(callback){
      var msg = new osc.OSCMessage(message);
      sock.send( msg, sendAddr, sendPort );
      sendLog( msg, sendAddr, sendPort );
      callback();
    }

    return th2.obj( transform, flush );

  }

  /**
   * Listen OSC message.
   * 
   * @param oscAddress
   * @param bindAddress
   * @param bindPort
   * @param callback
   * @returns {*}
   */
  GulpOSC.listen = function listen( oscAddress, bindAddress, bindPort, callback ){
    
    var key       = bindAddress+":"+bindPort,
        latestMsg = undefined,
        locked    = false;

    if( typeof sockHash[key] === "undefined" ){
      sockHash[key] = new osc.OSCSocket( bindPort, bindAddress );
    }

    function lock( stream ){
      locked = true;
      stream.on("end",function(){
        locked = false;
        if( typeof latestMsg !== "undefined" ){
          callback( latestMsg, lock );
          latestMsg = undefined;
        }
      });
    }

    sockHash[key].on(oscAddress,function(msg){
      receiveLog( msg );
      // If locked. Pending execute callback function.
      if( locked ){
        latestMsg = msg;
        return;
      }
      callback( msg, lock );
    });

  }

  /**
   * Send filename.
   * 
   * @param oscAddress
   * @param bindAddress
   * @param bindPort
   * @param callback
   * @returns {*}
   */
  GulpOSC.sendFileNames = function sendFileNames( oscAddress, sendAddr, sendPort ){

    var _files = [];

    /**
     * 渡された file からファイル名のリストを作成する.
     * @param file
     * @param encoding
     * @param callback
     * @returns {*}
     */
    function transform( file, encoding, callback ){
      if( file.isNull() ){
        return callback();
      }
      if( file.isStream() ){
        return callback();
      }
      var filename = file.path.substr( file.path.lastIndexOf("/")+1, file.path.length );
      _files.push( filename );
      callback();
    }

    function flush(callback){
      if( 0 < _files.length ){
        var msg = new osc.OSCMessage();
        msg.address = oscAddress;
        for( var i=0; i<_files.length; i++ ){
          msg.addArgument("s",_files[i]);
        }
        sock.send( msg, sendAddr, sendPort );
        sendLog( msg, sendAddr, sendPort );
      }
      callback();
    }

    return th2.obj( transform, flush );

  }




















}).call(this);
