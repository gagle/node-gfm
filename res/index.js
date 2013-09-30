"use strict";

var fs = require ("fs");
var path = require ("path");
var https = require ("https");

var downloadOcticons = function (fonts, cb){
	var octicon = function (url, filename, cb){
		var content = [];
		var len = 0;
		
		var req = https.request (url, function (res){
			if (res.statusCode !== 200){
				return cb (new Error ("Cannot connect to github.com"));
			}
			
			res.on ("data", function (data){
				content.push (data);
				len += data.length;
			});
			
			res.on ("end", function (){
				fs.writeFile (__dirname + "/" + filename, Buffer.concat (content, len),
						cb);
			});
		});
		
		req.on ("error", function (error){
			cb (error);
		});
		
		req.end ();
	};
	
	(function again (i){
		if (i === fonts.length) return cb (null);
		
		var file = path.basename (fonts[i]);
		process.stdout.write ("\n" + file + "... ");
		
		octicon ("https://github.com" + fonts[i], file, function (error, fonts){
			if (error){
				process.stdout.write ("\u001b[31mKO\u001b[0m\n");
				return cb (error);
			}
			
			process.stdout.write ("\u001b[32mOK\u001b[0m");
			
			again (i + 1);
		});
	})(0);
};

var downloadCss = function (url, filename, cb){
	var content = "";
	
	var req = https.request (url, function (res){
		if (res.statusCode !== 200){
			return cb (new Error ("Cannot connect to github.com"), null);
		}
		
		res.setEncoding ("utf8");
		
		res.on ("data", function (data){
			content += data;
		});
		
		res.on ("end", function (){
			var reFontFace = /(@font-face{.+?})/g;
			var reFontWoff = /url\("([^"]+\.woff)"\)/;
			var reFontEot = /url\("([^"]+\.eot)"\)/;
			var reFontTtf = /url\("([^"]+\.ttf)"\)/;
			var reFontSvg = /url\("([^"]+\.svg)/;
			var fonts = [];
			
			var fontFace = reFontFace.exec (content);
			if (!fontFace) return cb (null, null);
			
			//Remove the font-face styles
			var data = content;
			data = data.replace (fontFace[1], "");
			
			//Extract the octicons font files from the matched font-face style
			var woff = reFontWoff.exec (fontFace[1]);
			if (woff) fonts.push (woff[1]);
			var eot = reFontEot.exec (fontFace[1]);
			if (eot) fonts.push (eot[1]);
			var ttf = reFontTtf.exec (fontFace[1]);
			if (ttf) fonts.push (ttf[1]);
			var svg = reFontSvg.exec (fontFace[1]);
			if (svg) fonts.push (svg[1]);
			
			fs.writeFile (__dirname + "/" + filename,
					content.replace (fontFace[1], ""), function (error){
				cb (error, fonts);
			});
		});
	});

	req.on ("error", function (error){
		cb (error, null);
	});

	req.end ();
};

var getCssUrls = function (cb){
	var req = https.request ("https://github.com", function (res){
		if (res.statusCode !== 200){
			return cb (new Error ("Cannot connect to github.com"), null);
		}
		
		var urls = [];
		var reCss = /href="(.+\.css)"/g;
		var reBody = /<body/;
		
		res.setEncoding ("utf8");
		
		res.on ("data", function (data){
			var result;
			while (result = reCss.exec (data)){
				urls.push (result[1]);
			}
			if (reBody.exec (data)){
				req.abort ();
			}
		});
		
		res.on ("end", function (){
			cb (null, urls);
		});
	});
	
	req.setTimeout (1000, function (){
		req.abort ();
	});

	req.on ("error", function (error){
		cb (error, null);
	});

	req.end ();
};

var download = function (cb){
	process.stdout.write ("Downloading the GitHub resource files for the first " +
			"time... ");

	getCssUrls (function (error, urls){
		if (error){
			process.stdout.write ("\u001b[31mKO\u001b[0m\n");
			process.stdout.write ("Using the bundled resource files...");
			return cb (null);
		}
		
		var font = null;
		
		(function again (i){
			if (i === urls.length) return cb (null);
			
			var file = path.basename (urls[i]);
			process.stdout.write ("\n" + file + "... ");
			
			downloadCss (urls[i], file, function (error, fonts){
				if (error){
					process.stdout.write ("\u001b[31mKO\u001b[0m\n");
					return cb (error);
				}
				
				process.stdout.write ("\u001b[32mOK\u001b[0m");
				
				if (!fonts){
					//No font-face definition, try with the next css file
					again (i + 1);
				}else{
					downloadOcticons (fonts, cb);
				}
			});
		})(0);
	});
};

var build = function (cb){
	process.stdout.write ("\nCreating github.css... ");
	
	fs.readFile (__dirname + "/github-template", { encoding: "utf8" },
			function (error, template){
		if (error){
			process.stdout.write ("\u001b[31mKO\u001b[0m\n");
			return cb (error);
		}
		
		fs.readdir (__dirname, function (error, entries){
			if (error){
				process.stdout.write ("\u001b[31mKO\u001b[0m\n");
				return cb (error);
			}
			
			var files = [];
			var extname;
			for (var i=0, ii=entries.length; i<ii; i++){
				extname = path.extname (entries[i]);
				
				if (extname === ".ttf"){
					files.push ({ file: __dirname + "/" + entries[i], type: "ttf" });
					continue;
				}
				if (extname === ".woff"){
					files.push ({ file: __dirname + "/" + entries[i], type: "woff" });
					continue;
				}
				if (extname === ".eot"){
					files.push ({ file: __dirname + "/" + entries[i], type: "eot" });
					continue;
				}
				if (extname === ".svg"){
					files.push ({ file: __dirname + "/" + entries[i], type: "svg" });
					continue;
				}
			}
			
			(function again (i){
				if (i === files.length){
					files.forEach (function (file){
						template = template.replace ("{" + file.type + "}",
								new Buffer (file.data).toString ("base64"));
					});
				
					fs.writeFile (__dirname + "/github.css", template, function (error){
						if (error){
							process.stdout.write ("\u001b[31mKO\u001b[0m\n");
							return cb (error);
						}
						
						process.stdout.write ("\u001b[32mOK\u001b[0m");
						
						cb (null);
					});
					return;
				}
				
				fs.readFile (files[i].file, function (error, data){
					if (error){
						process.stdout.write ("\u001b[31mKO\u001b[0m\n");
						return cb (error);
					}
					
					files[i].data = data;
					
					again (i + 1);
				});
			})(0);
		});
	});
};

download (function (error){
	if (error){
		throw error;
	}
	
	build (function (error){
		
		if (error){
			throw error;
		}
		
		process.stdout.write ("\n");
	});
});