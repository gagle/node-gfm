"use strict";

var ROOT = ".";
var PORT = 4040;

module.exports = function (root, port){
	var len = arguments.length;
	if (len === 0){
		root = ROOT;
		port = PORT;
	}else if (len === 1){
		if (typeof root === "number"){
			port = root;
			root = ROOT;
		}else{
			port = PORT;
		}
	}
	
	
};