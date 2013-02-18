gfm
===

_Node.js project_

#### Converts GitHub flavored markdown files to html and provides a web editor to live preview ####

Version: 0.0.1

With this module you can mimic the GitHub documentation style to work in a local machine so you don't need to publish your project to GitHub to have a nice documentation.

You can convert [GitHub flavored markdown](http://github.github.com/github-flavored-markdown/) files to html and start a local server to edit and preview them in real-time. Hence, you don't need to authenticate to your GitHub account to use their preview api, you just write your markdown file locally and simply push the project when you're done.

A possible documentation methodology could be to start a local server, a.k.a. your _documentation server_. You can navigate through your project source files and open them to see their content. You can create new markdown files, edit, live preview, save them and save the generated html files. __Therefore, you can edit the documentation via browser and see the html result in real-time.__

<p align="center">
	<img alt="generate" src="http://image.gxzone.com/images/2/5/2553ea0bb6e.png"/>
</p>

#### Installation ####

```
npm install gfm
```

#### Example ####

```javascript
//Converts markdown files to html
var gfm = require ("gfm");
gfm.generate (".", function (error){
	if (error) return console.log (error);
});
```

```javascript
//Starts a local server to live preview
var gfm = require ("gfm");
gfm.live (".", 4040);
```

The module can be required and used from the API but it can also be used from CLI if you install it globally:

```
Usage: gfm [options]

Options:

  -h, --help                output usage information
  -s, --source <path>       source file or directory where the markdown files
                            are localed [.]

  -g, --generate            converts GitHub flavored markdown files to
                            highlighted html
  -d, --destination <path>  destination file or directory where the html files
                            are generated [. if source is a directory, removed
                            .md and ended in .html if source is a file]
  -e, --exclude <paths>     excludes files and directories
  -c, --compact             generates single html files without external
                            resources

  -l, --live                starts a local server to live preview the markdown
                            files
  -p, --port <number>       local server port number [4040]
```

Some examples:

Generate with `src` as source directory and `docs` as destination directory:

```
$ gfm -g -s src -d docs
```

Generate with `src` as source directory, `docs` as destination directory but create single html files for every markdown file (embedded resources):

```
$ gfm -g -c -s src -d docs
```

Convert `file.md` to a compacted `file.html` file:

```
$ gfm -g -c -s file.md
```

Generate markdown files located at `.` and exclude `node_modules` and `test/README.md`:

```
$ gfm -g -e node_modules,test/README.md
```

Start a local server with `.` as source directory and port 1234:

```
$ gfm -l -p 1234
```

#### Methods and Properties ####

- [gfm.generate(src[, settings], callback)](#generate)
- [gfm.live([src][, port])](#live)
- [gfm.silent](#silent)

<a name="generate"></a>
__gfm.generate(src[, settings], callback)__  
Converts GitHub flavored markdown files to html. The callback receives a possible error.

The source can be a directory or a file.

The possible settings are:
- destination. _String_. The destination file or directory where the html files will be stored. Default is `.`.
- exclude. _Array_. Array of paths to exclude. The paths are relative from the source directory path.
- compact. _Boolean_. Embeds all the external resources (css and font files) on every html file. A single html file is generated for every markdown file. If the generated html files are not compacted a directory named `gfm_res` will be created with all the external dependencies. Default is `false`.

<a name="live"></a>
__gfm.live([src][, port])__  
TODO, not yet implemented

<a name="silent"></a>
__gfm.silent__  
If `true` no messages will be printed to console. Default is `true` if it's used from the API and `false` if it's used from the CLI.