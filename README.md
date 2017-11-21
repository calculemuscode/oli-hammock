The oli-embedded-harness package is designed for [OLI](http://oli.cmu.edu/) developers that want to make
simple [embedded activities](https://github.com/CMUOLI/OLI/wiki/Creating-an-Embedded-Activity). It makes many
more assumptions than the default OLI Superactivity; the tradeoff is that there is less code required to
create and grade activities. (TODO: document some assumptions.)

Quickstart guide
================

We're assuming here that you know about the `custom_activity.xml` file and you have some sense of what you
want or expect that file to look like. The harness will usually need to contain one asset, "questions",
meaning that the file will look something like this:

``` xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE embed_activity PUBLIC "-//Carnegie Mellon University//DTD Embed 1.1//EN" "http://oli.cmu.edu/dtd/oli-embed-activity_1.0.dtd">
<embed_activity id="harnessed" width="500" height="300">
  <title>Harness demo</title>
  <source>Integers/webcontent/harness.js</source>
  <assets>
    <asset name="layout">Integers/webcontent/harnessed/layout.html</asset>
    <asset name="questions">Integers/webcontent/harnessed/questions.json</asset>
  </assets>
</embed_activity>
```

We expect your intended path will look different than ours and will not, for instance, contain `Integers`. If
the questions are not included, then the `<assets>` tag should be ignored. Other assets can be freely added,
but the harness expects all assets to have unique names.

Creating an npm project
-----------------------

You'll need to create a node project with three or four files. The `questions.json` file and `layout.html`
files are optional, but if they (or any other assets) exist, then they should be placed in the `assets` folder
along the same path listed in the project's XML configuration file. (Suggestion: make the contents of the
`assets` folder a symlink into the actual OLI project.)

```
|- main.xml
|- main.js
|- package.json
|- webpack.config.js
|- assets
    |- Integers
       |- webcontent
          |- harnessed
             |- layout.html
             |- questions.json
```

OLI Resources
-------------

The `main.xml` file is the project's configuration file that we displayed above. You may want to make this a
symlink to a "real" version as well.

The `layout.html` file tells the harness how to create the template for
the assignment:

```
<div>
  Fill in the blanks:<br/>
  <input type="text" id="blank0" /><br/>
  <input type="text" id="blank1" /><br/>
  <input type="text" id="blank2" />
</div>
```

The main.js file contains a single export, with `render`, `read`, and `process` functions.

 * The `render` method takes a QuestionData object (NOTE IT DOESN'T ACTUALLY DO THIS YET) to display the
   correct information within the template.
 * The `read` function pulls the current student input out of the question.
 * The `process` function transforms student input into a multiple-choice format.

```
const harness = require("@calculemus/oli-embedded-harness");

module.exports = harness.simple({
    render: function (data) {
        $("#blank0").val(data[0]);
        $("#blank1").val(data[1]);
        $("#blank2").val(data[2]);
    },

    read: function () {
        return [
            $(document.body).find("#blank0").text(),
            $(document.body).find("#blank1").text(),
            $(document.body).find("#blank2").text(),
        ];
    },

    process: function (input) {
        return input.map(x => x.toLowerCase());
    }
});
```

For any larger project, you're going to want to split this file up.

```
const harness = require("@calculemus/oli-embedded-harness");
module.exports = harness.simple({
    render: require("./src/render");
    read: require("./src/read");
    process: require("./src/process");
});
```

NPM Resources
-------------

The `package.json` configuration file should include this package, `webpack`, and `webpack-dev-server` as
`devDependencies`.

{
  "scripts": {
    "webpack": "webpack",
    "watch": "webpack-dev-server --progress --colors"
  },
  "devDependencies": {
    "@calculemus/oli-embedded-harness": "^0.0.1",
    "path": "^0.12.7",
    "webpack": "^3.8.1",
    "webpack-dev-server": "^2.9.4"
  }
}

The `webpack.config.js` configuration file:

```
const path = require("path");

module.exports = {
    entry: {
        activity: "./main.js"                 # You can rename this entry point freely
    },
    output: {
        filename: "activity.js",              # This needs to stay as activity.js
        libraryTarget: "umd",                 # Allows the RequireJS OLI Superactivity to read the output
        path: path.resolve(__dirname, "dist") # You could change this to target the OLI directory
    },
    devServer: {
        contentBase: [
            path.join(__dirname),
            path.join(__dirname, "node_modules/@calculemus/oli-embedded-harness/assets")
        ]
    }
}
```
