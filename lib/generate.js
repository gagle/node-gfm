"use strict";

var fs = require ("fs");
var path = require ("path");
var marked = require ("marked");
var highlight = require ("highlight.js");
var ep = require ("error-provider");
var mkdirp = require ("./mkdirp");
var res = require ("./resources");

marked.setOptions ({
	langPrefix: "language-",
	highlight: function (code, lang){
		return lang ? highlight.highlight (lang, code).value : code;
	}
});

var CSS_FILENAMES;
var CSS_DATA;
var EOL = process.platform === "win32" ? "\r\n" : "\n";

var log = function (msg){
	if (!module.parent.exports.silent){
		process.stdout.write (msg + "");
	}
};

var wrapImages = function (s){
	var reImg = /<img(.+?)\/>/g;
	var reSrc = /src="(.+?)"/;
	var res;
	var src;
	var data = s;
	while (res = reImg.exec (s)){
		src = reSrc.exec (res[1]);
		data = data.replace ("<img" + res[1] + "/>", "<a target=\"_blank\" " +
				"href=\"" + src[1] + "\">\n<img" + res[1] + "/>\n</a>");
	}
	return data;
};

var convert = function (md, html, compact, outResDir, cb){
	md = md.replace (/\\/g, "/");
	
	var s =
				"<!DOCTYPE html>" + EOL +
					"<html>" + EOL + 
						"<head>" + EOL +
							"<meta charset=\"utf-8\">" + EOL +
							"<title>" + md + "</title>" + EOL;
	var markedData;
	
	var concat = function (error, str){
		if (error) return cb (error);
		
		s += str +
				"</head>" + EOL +
				"<body>" + EOL +
					"<div id=\"content\">" + EOL +
						"<div id=\"readme\" class=\"announce instapaper_body md\">" +
								EOL +
							"<span class=\"name\">" + EOL +
								"<span class=\"mini-icon mini-icon-readme\"></span>" + EOL +
								md + EOL +
							"</span>" + EOL +
							"<article class=\"markdown-body\">" + EOL +
								markedData + 
							"</article>" + EOL +
						"</div>" + EOL +
					"</div>" + EOL +
				"</body></html>";
		
		mkdirp (path.dirname (html), function (error){
			if (error) return cb (error);
			fs.writeFile (html, s, "utf8", cb);
		});
	};

	fs.readFile (md, "utf8", function (error, data){
		if (error) return cb (error);
		
		try{
			markedData = marked (data);
		}catch (e){
			return cb (error);
		}
		
		markedData = wrapImages (markedData);
		
		if (compact){
			res.stylesHeader (concat);
		}else{
			res.stylesHeader (function (f){
				return path.relative (path.dirname (html), outResDir + "/" + f);
			}, concat);
		}
	});
};

module.exports = function (md, args, cb){
	if (arguments.length === 2){
		cb = args;
		args = {};
	}
	args.compact = !!args.compact;

	res.update (function (error){
		if (error) return cb (error);
		
		var first = true;
		var outResDir;
		var errors = [];
		
		var name = function (n){
			return path.basename (n, ".md") + ".html";
		};
		
		var gen = function (md, cb){
			var exit = function (error){
				if (error){
					errors = errors.concat (error);
				}
				cb ();
			};
			
			var fileFlow = function (){
				log ("File: { markdown: " + md + ", html: " + html + ", compact: " +
						args.compact + " }\n");
				
				convert (md, html, args.compact, outResDir, exit);
			};
			
			var dirFlow = function (){
				fs.readdir (md, function (error, entries){
					if (error) return exit (error);
					
					var remaining = entries.length;
					if (!remaining) return exit ();
					
					var errors = [];
					
					var finish = function (){
						if (!--remaining) cb (errors.length ? errors : null);
					};
					
					entries.forEach (function (entry){
						gen (path.join (md, entry), finish);
					});
				});
			};
			
			var html;
			
			fs.stat (md, function (error, stats){
				if (error) return exit (error);
				
				if (stats.isFile ()){
					if (first){
						html = args.destination || name (md);
						outResDir = args.destination
								? path.join (path.dirname (args.destination), res.OUT_RES_DIR)
								: res.OUT_RES_DIR;
						
						if (!args.compact){
							res.externalize (outResDir, function (error){
								if (error) return exit (error);
								fileFlow ();
							});
							return;
						}
					}else{
						if (path.extname (md) !== ".md") return exit ();
						html = path.join (args.destination, path.dirname (md), name (md));
					}
					fileFlow ();
				}else if (stats.isDirectory ()){
					if (first){
						first = false;
						args.destination = args.destination || ".";
						outResDir = path.join (args.destination, res.OUT_RES_DIR);
						
						log ("Output directory: " + args.destination + "\n");
						
						if (!args.compact){
							res.externalize (outResDir, function (error){
								if (error) return exit (error);
								dirFlow ();
							});
							return;
						}
					}
					dirFlow ();
				}else{
					exit ();
				}
			});
		};
		
		log ("Generating HTML...\n");
		gen (md, function (){
			if (errors.length){
				log ("\u001b[31mFinished: " + errors.length + " errors.\u001b[0m\n");
				cb (errors);
			}else{
				log ("\u001b[32mFinished: 0 errors.\u001b[0m\n");
				cb (null);
			}
		});
	});
};