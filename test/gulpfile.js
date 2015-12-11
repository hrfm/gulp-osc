var g   = require('gulp');
var osc = require('../index.js');

osc.listen( "/hoge", 12345, function(msg,lock){
	console.log(msg);
	// タスクが多重に実行されないようにする.
	lock(
		g.src("test.txt").pipe(g.dest("dest")),
		false
	);
} );

g.task("default",function(){
	return g.src("**/*.txt")
			// src で読み込まれているファイルパスを OSC で送信するように自前で through2 を書く場合.
			.pipe(
				osc.through2(
					function(through2,msg){
						return through2(
							function ( file, encoding, callback ){
								if( file.isNull() ){
									return callback();
								}
								if( file.isStream() ){
									return callback();
								}
								msg.addArgument("s",file.path);
								this.push(file);
								callback();
							},
							function( callback ){ callback(); }
						);
					},
					"/hoge", 12345, "192.168.1.255"
				)
			)
			// 上と同じ機能を持った関数.フィルタも使える.
			.pipe(
				osc.sendSrcPath({
					"oscAddress"  : "/hoge",
					"sendPort"    : 12345,
					"sendAddress" : "192.168.1.255",
					"filter"      : function(path){
						return path.substr( path.lastIndexOf("/")+1, path.length );;
					}
				})
			)
			.pipe(
				osc( "/hoge ,i 10", 12345, "192.168.1.255" )
			)
			.pipe(
				osc({
					"message"     : "/hoge ,i 10",
					"sendPort"    : "12345",
					"sendAddress" : "192.168.1.255"
				})
			);
});
