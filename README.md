node-osc
==============

<!--
Getting started
-----

    npm install gulp-osc

-->

Usage
-----

### 1. Send OSC message.

```javascript
var osc = require('gulp-osc');
gulp.src("test.txt")
    .pipe(gulp.dest("dest"))
    .pipe(osc("/hoge ,i 1","127.0.0.1",10000));
```

### 2. Send src filenames.

```javascript
var osc = require('gulp-osc');
gulp.src("*.txt")
    .pipe(osc.sendFileNames("/files","127.0.0.1",10000));
```

### 3. Listen and run task.

```javascript
var osc = require('gulp-osc');

osc.listen("/message","127.0.0.1",10000,function(msg,lock){
    lock(
        gulp.src("*.txt")
            .pipe(gulp.dest("dest));
    );
});
```

#### What is lock?

``lock()`` means "Do not call this callback until ended this task.".  

If receive same OSC message continuously in a short period of time.  
Might your task is not finished.  
At that time you write your task inner lock function.

If gulp-osc received new OSC message during run task.  
gulp-osc calling callback function after current task end.

I think you should always using lock function.
