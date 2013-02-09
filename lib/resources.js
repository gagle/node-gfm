"use strict";

var https = require ("https");
var fs = require ("fs");
var path = require ("path");
var ep = require ("error-provider");
var mkdirp = require ("./mkdirp");

ep.create (ep.next (), "INVALID_STATUS_CODE", "Invalid status code: {code}",
		{ code: "{code}" });

var EOL = process.platform === "win32" ? "\r\n" : "\n";
var NAME_RES_DIR = "res";
var RES_DIR = __dirname + "/../" + NAME_RES_DIR + "/";
var CHECKED = false;
var CHECK_FILE = __dirname + "/../update";
var GITHUB_URL = "https://github.com";
var FONT = "octicons";
var CUSTOM_CSS = "github";
var CUSTOM_CSS_REPLACE = "{base64_data}";
var FILES = {};
var LOADED_NAMES = false;
var LOADED_DATA = false;
		
var res = module.exports = {};
res.OUT_RES_DIR = "gfm_res";

var log = function (msg){
	if (!module.parent.parent.exports.silent){
		process.stdout.write (msg + "");
	}
};

res.externalize = function (p, cb){
	log ("External resources directory: " + p + "\n");
	
	mkdirp (p, function (error){
		if (error) return cb (error);
		
		fs.readdir (RES_DIR, function (error, entries){
			if (error) return cb (error);
			
			var remaining = entries.length;
			if (!remaining) return cb (null);
			
			var errors = [];
			
			var finish = function (){
				if (!--remaining) cb (errors.length ? errors : null);
			};
		
			entries.forEach (function (entry){
				if (entry === CUSTOM_CSS + ".template") return finish ();
				
				var sin = fs.createReadStream (RES_DIR + entry);
				sin.on ("error", function (error){
					errors.push (error);
					finish ();
				});
				var sout = fs.createWriteStream (path.join (p, entry));
				sout.on ("error", function (error){
					errors.push (error);
					finish ();
				});
				sout.on ("close", finish);
				sin.pipe (sout);
			});
		});
	});
};

var loadCSSNames = function (cb){
	if (LOADED_NAMES) return cb (null);
	
	fs.readdir (RES_DIR, function (error, entries){
		if (error) return cb (error);
		
		entries.forEach (function (entry){
			if (entry === CUSTOM_CSS + ".template") return;
			if (FILES[entry]) return;
			FILES[entry] = null;
		});
		
		LOADED_NAMES = true;
		cb (null);
	});
};

var loadData = function (cb){
	if (LOADED_DATA) return cb (null);
	
	fs.readdir (RES_DIR, function (error, entries){
		if (error) return cb (error);
		
		var remaining = entries.length;
		if (!remaining) return cb (null);
		
		var errors = [];
		
		var finish = function (){
			if (!--remaining){
				if (errors.length){
					cb (errors);
				}else{
					LOADED_DATA = true;
					LOADED_NAMES = true;
					cb (null);
				}
			}
		};
		
		entries.forEach (function (entry){
			if (entry === CUSTOM_CSS + ".template") return finish ();
			
			fs.readFile (RES_DIR + entry, "utf8", function (error, data){
				if (error){
					errors.push (error);
				}else{
					FILES[entry] = data;
				}
				finish ();
			});
		});
	});
};

res.stylesHeader = function (onHref, cb){
	if (!cb){
		cb = onHref;
		onHref = null;
	}
	
	var s = "";
	
	if (onHref){
		loadCSSNames (function (error){
			if (error) return cb (error);
			for (var f in FILES){
				s += "<link type=\"text/css\" rel=\"stylesheet\" media=\"screen\" " +
					"href=\"" + onHref (f) + "\">" + EOL;
			}
			cb (null, s);
		});
	}else{
		loadData (function (error){
			if (error) return cb (error);
			for (var f in FILES){
				s += "<style>" + EOL + FILES[f] + "</style>" + EOL;
			}
			cb (null, s);
		});
	}
};

var downloadFont = function (url, cb){
	var content = [];
	var len = 0;
	
	var req = https.request (url, function (res){
		if (res.statusCode !== 200){
			return cb (ep.get ("INVALID_STATUS_CODE", { code: res.statusCode }),
					null);
		}
		res.on ("data", function (data){
			content.push (data);
			len += data.length;
		});
		res.on ("end", function (){
			cb (null, Buffer.concat (content, len).toString ("base64"));
		});
	});

	req.on ("error", function (error){
		cb (error, null);
	});
	req.end ();
};

var downloadCSS = function (url, name, cb){
	var s = fs.createWriteStream (RES_DIR + name, { encoding: "utf8" });
	var reFontFace = /(@font-face{.+?})/g;
	var reFontUrl = /url\("([^"]+\.woff)"\)/g;
	var res;
	var content = "";
	var fontUrl = null;
	
	var req = https.request (url, function (res){
		if (res.statusCode !== 200){
			return cb (ep.get ("INVALID_STATUS_CODE", { code: res.statusCode }),
					null);
		}
		res.setEncoding ("utf8");
		res.on ("data", function (data){
			content += data;
		});
		res.on ("end", function (){
			//Removes the font-face styles
			var found = false;
			var data = content;
			while (res = reFontFace.exec (content)){
				found = true;
				data = data.replace (res[1], "");
				
				//Extracts the octicons font url
				var url = reFontUrl.exec (res[1]);
				if (!fontUrl && url && res[1].indexOf ("Octicons Regular") !== -1){
					fontUrl = url[1];
				}
			}
			
			fs.writeFile (RES_DIR + name, data, "utf8", function (error){
				cb (error, fontUrl);
			});
		});
	});

	req.on ("error", function (error){
		cb (error, null);
	});

	req.end ();
};

var extractCSSUrls = function (cb){
	var req = https.request (GITHUB_URL, function (res){
		if (res.statusCode !== 200){
			return cb (ep.get ("INVALID_STATUS_CODE", { code: res.statusCode }),
					null);
		}
		
		var res;
		var css = [];
		var reCss = /href="(.+?\.css)"/g;
		var reBody = /<body/;
		
		res.setEncoding ("utf8");
		res.on ("data", function (data){
			while (res = reCss.exec (data)){
				css.push (res[1]);
			}
			if (reBody.exec (data)){
				req.abort ();
			}
		});
		res.on ("end", function (){
			cb (null, css);
		});
	});

	req.on ("error", function (error){
		cb (error, null);
	});

	req.end ();
};

var download = function (cb){
	extractCSSUrls (function (error, urls){
		if (error) return cb (error);
		
		var remaining = urls.length;
		if (!remaining) return cb (null);
		
		var errors = [];
		
		var finish = function (){
			if (!--remaining){
				if (errors.length){
					cb (errors);
				}else{
					downloadFont (font, function (error, base64){
						if (error) return cb (error);
						
						fs.readFile (RES_DIR + CUSTOM_CSS + ".template", "utf8",
								function (error, data){
										if (error) return cb (error);
										
										fs.writeFile (RES_DIR + CUSTOM_CSS + ".css", data.replace (
												CUSTOM_CSS_REPLACE, base64), "utf8", cb);
								});
					});
				}
			}
		};
		
		var font = null;
		
		for (var i=0, len=urls.length; i<len; i++){
			downloadCSS (urls[i], "github" + (i + 1) + ".css",
					function (error, fontUrl){
						if (error) errors.push (error);
						if (fontUrl) font = fontUrl;
						finish ();
					});
		}
	});
};

res.update = function (cb){
	if (CHECKED) return cb (null);
	
	fs.exists (CHECK_FILE, function (exists){
		if (!exists){
			cb (null);
		}else{
			log ("Updating the GitHub resource files for the first time...");
			download (function (errors){
				if (errors){
					log ("\u001b[31m KO\u001b[0m\n");
					log ("Using the packed resource files.\n");
				}else{
					log ("\u001b[32m OK\u001b[0m\n");
				}
				fs.unlink (CHECK_FILE, function (error){
					if (errors){
						if (!error) error = [];
						cb (errors.concat (error));
					}else{
						cb (error);
					}
				});
			});
		}
	});
};