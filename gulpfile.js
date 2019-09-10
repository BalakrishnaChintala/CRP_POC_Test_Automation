'use strict';

var gulp = require('gulp');
var angularProtractor = require('gulp-angular-protractor');

    gulp.task('CRP-Automation', function(callback) {
        gulp
            .src(['./*.js']) 
            .pipe(angularProtractor({      
                'configFile': 'conf.js',
            }))
            .on('error', function(e) {
                console.log(e);
            })
            .on('end', callback);

});
