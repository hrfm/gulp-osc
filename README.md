gulp-osc
==============

Using OSC messages with gulp!

    gulp で osc つかってなんかやろうとしたらなんか出来た。
    むしゃくしゃしてやった。いまは(ry

<!--
Getting started
-----

    npm install gulp-osc

-->

Usage
-----

### 1. Send OSC message.

    引数で指定した OSC を送ります。それだけです。

```javascript
var osc = require('gulp-osc');
gulp.src("test.txt")
    .pipe(osc("/hoge ,i 1",10000,"127.0.0.1"));
```

or

```javascript
gulp.src("test.txt")
    .pipe(
    	osc({
    		"message"     : "/hoge ,i 1",
    		"sendPort"    : 10000,
    		"sendAddress" : "127.0.0.1"
    	})
    );
```

### 2. Send src path.

    pipe に入ってきたファイル名を送ります。
    filter 関数を指定していじってから送ることもできます。

```javascript
var osc = require('gulp-osc');
gulp.src("*.txt")
    .pipe(osc.sendSrcPath(
    	"/hoge",
    	12345,
    	"localhost",
    	function(path){
			return path.substr( path.lastIndexOf("/")+1, path.length );
		}
	});
```

or

```javascript
gulp.src("*.txt")
    .pipe(osc.sendSrcPath({
		"oscAddress"  : "/hoge",
		"sendPort"    : 12345,
		"sendAddress" : "localhost",
		"filter"      : function(path){
			return path.substr( path.lastIndexOf("/")+1, path.length );
		}
	});
```

### 3. Build OSCMessage with through2 by yourself.

    完全に自分で好き放題やりたいというあなたに。
    through2 経由でいろいろいじれます。

    第１引数に through2.obj 関数への参照
    第２引数に oscMessage が渡されるので
    transform なり flush なりの中で oscMessage.addArgument すればその内容が送れます。

```javascript
var osc = require('gulp-osc');
gulp.src("*.txt")
    .pipe(osc.through2(
    	function(through2,oscMessage){
    		return through2(
    			function transform(file,encoding,callback){
    				// for example.
    				oscMessage.addArgument("s",file.path);
    				this.push(file);
    				callback();
    			},
    			function flush(callback){
    				// do something.
    				callback();
    			}
    		);
    	},
    	{
			"oscAddress"  : "/hoge",
			"sendPort"    : 12345,
			"sendAddress" : "localhost"
		}
	});
```

### 4. Listen and run task.

    OSC送られてきたら処理をしたいという時に使います。
    指定した port に指定した OSC のアドレスのメッセージがきたら
    コールバックが実行されるので後はタスクを実行しましょう。

    lock() を使うと、その中で走らせた gulp タスクが終わるまで
    コールバックを呼ばなくなるので走りまくるみたいなことも防げます。

    また、lock の第２引数で、ロック中にメッセージがきちゃった場合
    終了後もう一回呼ぶかどうかの指定が出来るようになっているので
    false にすると、実行中きたメッセージは無視できます。

```javascript
var osc = require('gulp-osc');
osc.listen("/message",10000,function(msg,lock){
    lock(
        gulp.src("*.txt")
            .pipe(gulp.dest("dest"));
    );
});
```

#### What is lock?

``lock()`` means "Do not call this callback until ended this task.".  

If receive same OSC message continuously in a short period of time.  
Might your task is not finished.  
That will be a fatal problem (at least for me).

At that time, write task inner lock function.  
Then, If gulp-osc received new OSC message during run task.  
gulp-osc calling callback function after current task end.

I think you should always using lock function.
