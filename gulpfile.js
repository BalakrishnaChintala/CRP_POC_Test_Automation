var gulp = require('gulp');
var angularProtractor = require('gulp-angular-protractor');
    gulp.task('CRP-Automation', function(callback) {
        gulp
            .src(['./*.js']) 
            .pipe(angularProtractor({      
                'configFile': 'conf.js',
            }))

});
