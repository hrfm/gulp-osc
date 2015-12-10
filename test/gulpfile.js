var g   = require('gulp');
var osc = require('../index.js');

osc.listen( "/hoge", "0.0.0.0", 12345, function(msg,lock){
	lock(
		g.src("test.txt").pipe(g.dest("dest"))
	);
} );

g.task("default",function(){
	return g.src("test.txt")
			.pipe( osc.sendFileNames("/hoge","0.0.0.0",12345) )
			.pipe( osc("/hoge ,i 10","0.0.0.0",12345) );
});
