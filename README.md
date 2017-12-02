The oli-hammock package is designed for [OLI](http://oli.cmu.edu/) developers that want to make simple
[embedded activities](https://github.com/CMUOLI/OLI/wiki/Creating-an-Embedded-Activity). It makes many more
assumptions than the default OLI Superactivity; the tradeoff is that there is less code required to create and
grade activities.

You wrap your simple activity specification up in the OLI Hammock, and you hang the hammock into the OLI
embedded activity framework. OLI runs the activity+hammock combination, which is smushed together with the
help of Webpack, into something that looks like a regular old activity to the OLI Superactivity.

```
              -------------------------- Your activity, resting in the hammock
              |
              |           |------------- The OLI Hammock
              v           v
\uuuu                  uuuu/ <---------- The OLI Superactivity & OLI's APIs
 \ uuuuu   o<-<     uuuuu /
  \    uuuuuuuuuuuuuu    /
   \                    /
   ----------------------
```

Example project
===============

This tutorial walks through the
[evenodd](https://github.com/calculemuscode/oli-hammock-examples/tree/master/evenodd) example in the
[oli-hammock examples](https://github.com/calculemuscode/oli-hammock-examples) assuming here that you've
previously seen the XML file containing an `<embed-activity/>` element, and you have some sense of what you
want or expect that file to look like.

An activity should be its own npm project, structured roughly like this. Likely you won't be using the
`Integers` directory here. You may want to make `assets` and `main.xml` symlinks to the appropriate place in
the OLI project's SVN directory. You can also omit `assets` and `main.xml`, but then you will not be able to
test your activity without uploading it to OLI.

```
|- main.xml           -- <embed-activity/> specification file
|- main.js            -- Entry point for assignment HTML
|- package.json       -- Bolierplate
|- webpack.config.js  -- Bolierplate
|- assets
    |- Integers
       |- webcontent
          |- evenodd
             |- layout.html     -- The initial template for the question
             |- questions.json  -- The question specification
```

This is the simplest imaginable project; it doesn't do any hints or formatting of output at all.

main.xml
--------

The `main.xml` file is only needed if you plan to test the project. It will need to contain at least two
assets, "layout" and "questions". Other assets can be freely added, but the harness expects all assets to have
unique names.

``` xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE embed_activity PUBLIC "-//Carnegie Mellon University//DTD Embed 1.1//EN" "http://oli.cmu.edu/dtd/oli-embed-activity_1.0.dtd">
<embed_activity id="harnessed" width="500" height="300">
  <title>Harness demo</title>
  <source>Integers/webcontent/evenodd/activity.js</source>
  <assets>
    <asset name="layout">Integers/webcontent/evenodd/layout.html</asset>
    <asset name="questions">Integers/webcontent/evenodd/questions.json</asset>
  </assets>
</embed_activity>
```

The assets file does much of the declarative specification of the project. We'll look at the `layout.html` and
`questions.json` files next. They don't need to actually be named `layout.html` and `questions.json`, they
just need to be `.html` and `.json` assets with the right `asset name`.

layout.html
-----------

The `layout.html` file defines a template for receiving student input and displaying hints and feedback. It
does not include the submission logic.

``` html
<div>
  <p id="prompt" />
  <input type="text" id="blank0" />
  <p id="feedback0" />
  <input type="text" id="blank1" />
  <p id="feedback1" />
</div>
```

main.js
-------

The `main.js` file contains wraps the hammock around the assignment logic. The assignment logic, which in a
larger project would probably be split into multiple files, explains how to `render` existing student
responses and feedback onto the layout, how to `read` current student responses from the layout, and how to
`parse` the student responses into a string for grading.

``` js
const hammock = require("@calculemus/oli-hammock");
module.exports = hammock.simple({
    render: (data) => {
       $("#prompt").text(data.prompt);
       $("#blank0").val(data.parts[0].response);
       $("#feedback0").text(data.parts[0].analysis ? data.parts[0].analysis.feedback : "");
       $("#blank1").val(data.parts[1].response);
       $("#feedback1").text(data.parts[1].analysis ? data.parts[1].analysis.feedback : "");
    },

    read: () => {
       return [
           $("#blank0").val(),
           $("#blank1").val()
       ];
    },

    parse: str => {
       if (!str || str === "") return "blank";
       const i = parseInt(str);
       if (isNaN(i)) return "nan";
       if (i.toString() != i) return "nan";
       if (i < 0) return "neg";
       return i % 2 === 0 ? : "even" : "odd";
    }
});
```

The `render` function changes the contents defined in the `layout` asset, it is the only function that does
so, and it has to be careful what changes it makes to the layout. This funciton must _always_ produce the same
display given the same information, regardless of what sequence of `render` calls have happened earlier.

The `read` function captures all student response data into an array of serializable objects (one per question
part). The hammock doesn't care what type of data this is, as long as `JSON.parse(JSON.stringify(data))` is
structurally the same as `data`.

The `parse` function is optional; if it is omitted, then the `read` function needs to produce an array of
_strings_, which will themselves be used as the keys for grading. If there's one `parse` function, it's used
for all question parts. If there's an array of `parse` functions, then one is used for each question. (See the
[intmax](https://github.com/calculemuscode/oli-hammock-examples/tree/master/intmax) example project for an
example.)

questions.json
--------------

The `questions.json` asset defines how many parts a question has (this must agree with the activity spec's
`read` function). This file includes most of the grading logic; if there is no `parse` function defined, then
it includes all of the grading and feedback logic.

``` json
{
  "prompt": "Enter a nonnegative even number, then a nonnegative odd number",
  "parts": [
    {
      "match": {
        "even": [true, "Correct, that's an even number."],
        "odd": "Incorrect, that's not an even number.",
        "neg": "Incorrect. That's a negative number, and we asked for a nonnegative number.",
        "blank": "Please given an answer for this part."
      },
      "nomatch": "That's not an integer."
    },
    {
      "match": {
        "even": "Incorrect, that's not an odd number.",
        "odd": [true, "Correct, that's an odd number."],

        "neg": "Incorrect. That's a negative number, and we asked for a nonnegative number.",
        "blank": "Please given an answer for this part."
      },
      "nomatch": "That's not an integer."
    }
  ]
}
```

package.json
------------

The first boilerplate file is `package.json`; we use NPM to install dependencies and run scripts.

```
{
  "scripts": {
    "webpack": "webpack",
    "watch": "webpack-dev-server --progress --colors"
  },
  "devDependencies": {
    "@calculemus/oli-hammock": "^0.0.3",
    "path": "^0.12.7",
    "webpack": "^3.8.1",
    "webpack-dev-server": "^2.9.4"
  }
}
```

You should probably reinstall the four dependencies rather than copy-pasting this file so you get the latest
version.

webpack.config.js
-----------------

Webpack is confusing and has too many options, but you should be able to just copy and paste this file.

``` js
const path = require("path");

module.exports = {
    entry: {
        activity: "./main.js"
    },
    output: {
        filename: "activity.js",
        libraryTarget: "umd",
        path: path.resolve(__dirname, "dist")
    },
    devServer: {
        contentBase: [
            path.join(__dirname),
            path.join(__dirname, "node_modules/@calculemus/oli-hammock/assets")
        ]
    }
}
```

With these six files in place, you can run `npm i` and `npm run watch` and then go to [http://localhost:8080/]
to interact with the assignment.

If you set up the `assets` directory as a symlink, and you want `npm run webpack` to put the complied file in,
say, `Integers/webcontent/evenodd/activity.js` so that it can be checked right in to SVN, then you would
change the `path` argument under `output` to `path.resolve(__dirname, "assets/Integers/webcontent/evenodd")`.
