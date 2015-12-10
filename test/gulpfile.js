var g   = require('gulp');
var osc = require('../index.js');

osc.listen( "/hoge", "127.0.0.1", 12345, function(msg,lock){
	console.log("weeeee");
	lock(
		g.src("test.txt").pipe(g.dest("dest"))
	);
} );

g.task("default",function(){
	return g.src("test.txt")
			.pipe( osc.sendFileNames("/hoge","127.0.0.1",12345) )
			.pipe( osc("/hoge ,i 10","127.0.0.1",12345) );
});
