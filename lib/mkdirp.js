"use strict";

var fs = require ("fs");
var path = require ("path");

module.exports = function (p, cb){
	var mkdir = function (p, cb){
		fs.mkdir (p, function (error){
			if (error && error.code !== "ENOENT" && error.code !== "EEXIST"){
				return cb (error);
			}else if (error && error.code === "EEXIST"){
				return cb (null);
			}else if (!error){
				return cb (null);
			}
			
			//ENOENT
			var parent = path.dirname (p);
			if (parent === p) return cb (null);
			
			mkdir (parent, function (error){
				fs.mkdir (p, function (error){
					//Ignore EEXIST error in asynchronous calls to mkdirp
					cb (error && error.code !== "EEXIST" ? error : null);
				});
			});
		});
	};
	
	mkdir (path.resolve (p), cb);
};