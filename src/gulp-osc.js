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

  function sendLog( msg, sendPort, sendAddr ){
    if( typeof sendAddr === "undefined" ) sendAddr = "0.0.0.0";
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
  sock.setBroadcast(true);
  sock.bind();

  var sockHash = {};

  var GulpOSC = module.exports = function( message, sendPort, sendAddr ){

    // ---------------------------------------------------------

    // object で指定された場合の処理.
    if( typeof message === "object" ){
      sendPort = message.sendPort;
      sendAddr = message.sendAddress;
      message  = message.message;
    }

    // ---------------------------------------------------------

    function transform( file, encoding, callback ){
      this.push(file);
      callback();
    }

    function flush(callback){
      var msg = new osc.OSCMessage(message);
      sock.send( msg, sendPort, sendAddr );
      sendLog( msg, sendPort, sendAddr );
      callback();
    }

    return th2.obj( transform, flush );

    // ---------------------------------------------------------

  }

  /**
   * Listen OSC message.
   * 
   * @param oscAddress
   * @param bindOptions
   * @param callback
   * @returns {*}
   */
  GulpOSC.listen = function listen( oscAddress, bindOptions, callback ){
    
    // ---------------------------------------------------------

    // object で指定された場合の処理.
    if( typeof oscAddress === "object" ){
      bindOptions = oscAddress.bindOptions;
      callback    = oscAddress.callback;
      oscAddress  = oscAddress.oscAddress;
    }

    // ---------------------------------------------------------

    var key, latestMsg = undefined, locked = false;

    if( typeof bindOptions === "number" ){
      key = bindOptions;
    }else if( typeof bindOptions === "object" && typeof bindOptions.port !== "undefined" ){
      key = bindOptions.port;
    }
    if( typeof key === "undefined" ){
      key = "_" + new Date().time;
    }

    if( typeof sockHash[key] === "undefined" ){
      sockHash[key] = new osc.OSCSocket();
      sockHash[key].bind( bindOptions );
    }

    function lock( stream, callAfterEnd ){
      if( typeof callAfterEnd === "undefined" ){
        callAfterEnd = true;
      }
      locked = true;
      stream.on("end",function(){
        locked = false;
        if( typeof latestMsg !== "undefined" && callAfterEnd ){
          callback( latestMsg, lock );
        }
        latestMsg = undefined;
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

    // ---------------------------------------------------------

  }

  /**
   * through2 での処理内容を自前で実装する場合に使います.
   * 
   * @param factory
   * @param oscAddress
   * @param sendPort
   * @param sendAddr
   */
  GulpOSC.through2 = function _through2( factory, oscAddress, sendPort, sendAddr ){
    
    // ---------------------------------------------------------

    // object で指定された場合の処理.
    if( typeof oscAddress === "object" ){
      sendPort   = oscAddress.sendPort;
      sendAddr   = oscAddress.sendAddress;
      oscAddress = oscAddress.oscAddress;
    }
    
    // ---------------------------------------------------------

    var msg     = new osc.OSCMessage();
    msg.address = oscAddress;

    var th2Obj = factory(th2.obj,msg);
    th2Obj.on('end',function(){
      sock.send( msg, sendPort, sendAddr );
      sendLog( msg, sendPort, sendAddr );
    });

    return th2Obj;

    // ---------------------------------------------------------

  }

  /**
   * Send filename.
   * 
   * @param oscAddress
   * @param sendPort
   * @param sendAddr
   * @returns {*}
   */
  GulpOSC.sendSrcPath = function sendSrcPath( oscAddress, sendPort, sendAddr ){

    var filter = function(srcPath){
      return srcPath;
    };

    // ---------------------------------------------------------

    // object で指定された場合の処理.
    if( typeof oscAddress === "object" ){
      sendPort = oscAddress.sendPort;
      sendAddr = oscAddress.sendAddress;
      if( typeof oscAddress.filter == "function" ){
        filter = oscAddress.filter;
      }
      oscAddress = oscAddress.oscAddress;
    }

    // ---------------------------------------------------------

    return GulpOSC.through2(
      function(t,m){
        var _files = [];
        return t(
          function ( file, encoding, callback ){
            if( file.isNull() ){
              return callback();
            }
            if( file.isStream() ){
              return callback();
            }
            _files.push( filter(file.path) );
            this.push(file);
            callback();
          },
          function (callback){
            if( 0 < _files.length ){
              for( var i=0; i<_files.length; i++ ){
                m.addArgument("s",_files[i]);
              }
            }
            callback();
          }
        );
      },
      oscAddress, sendPort, sendAddr
    );

    // ---------------------------------------------------------

  }

}).call(this);
