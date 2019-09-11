'use strict';

var gulp = require('gulp');
var angularProtractor = require('gulp-angular-protractor');


    gulp.task('CRP-Automation', function(done) {
        gulp
            .src(['./*.js']) 
            .pipe(angularProtractor({      
                'configFile': 'conf.js',
                autoStartStopServer: true
            }))
            .on('error', function(e) {
                console.log(e);
                done();
            })
            .on('end', function () {
                setTimeout(() => process.exit(), 5000);
                done();
              });

});
