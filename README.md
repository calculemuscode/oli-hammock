(This documentation is the nicest to read at https://oli-hammock.surge.sh.)

The oli-hammock package is designed for [OLI](https://oli.cmu.edu/) developers that want to make simple
[embedded activities](https://github.com/CMUOLI/OLI/wiki/Creating-an-Embedded-Activity). Assignments made with
OLI Hammock are significantly less configurable than activities built directly against the OLI Superactivity;
the tradeoff is that there is less code required to create and grade activities.

You wrap your simple {@link Activity} specification up in the OLI Hammock with the {@link hammock} function,
and you hang the hammock into the OLI embedded activity framework. OLI runs the activity+hammock combination,
which gets smushed together with the help of Webpack into something that might as well be a regular old
embedded activity, as far as OLI Superactivity is concerned.

```
               ------------------- Your activity, resting in hammock
               |
               v          |------- The OLI Hammock
              o           v
\uuuu        /|\       uuuu/   |-- The OLI Superactivity & OLI APIs
 \ uuuuu     / \    uuuuu /    |
  \    uuuuuuuuuuuuuu    /     |
   \                    / <----|
   ----------------------
```

[![npm version](https://badge.fury.io/js/%40calculemus%2Foli-hammock.svg)](https://badge.fury.io/js/%40calculemus%2Foli-hammock)
[![Build Status](https://travis-ci.org/calculemuscode/oli-hammock.svg?branch=master)](https://travis-ci.org/calculemuscode/oli-hammock)
[![dependencies Status](https://david-dm.org/calculemuscode/oli-hammock/status.svg)](https://david-dm.org/calculemuscode/oli-hammock)
[![devDependencies Status](https://david-dm.org/calculemuscode/oli-hammock/dev-status.svg)](https://david-dm.org/calculemuscode/oli-hammock?type=dev)

Example project
===============

This walkthrough covers the
[evenodd](https://github.com/calculemuscode/oli-hammock-examples/tree/master/evenodd) project in the
[oli-hammock examples](https://github.com/calculemuscode/oli-hammock-examples).

An activity should be its own npm project, structured roughly like this. This is the simplest imaginable
project; it doesn't do any hints or formatting of output at all. The
[names](https://github.com/calculemuscode/oli-hammock-examples/tree/master/names) example is a slightly more
realistic activity that uses [oli-widgets](https://www.npmjs.com/package/@calculemus/oli-widgets) to give
elements the correct style.

 * `main.js` - Entry point for assignment (defined in `webpack.config.js`) that calls the {@link hammock} function
    with an {@link Activity} object defining the activity.
 * `package.json` - boilerplate
 * `webpack.config.js` - boilerplate

main.js
-------

The `main.js` file wraps the {@link hammock} function around the {@link Activity} object containing the
assignment logic. In this example, the assignment logic, which in a larger project would probably be split
into multiple files, explains how to `render` existing student responses and feedback onto the layout, how to
`read` current student responses from the layout, and how to `parse` the student responses into a string for
grading.

``` js
const hammock = require("@calculemus/oli-hammock");

const parse = (str) => {
    if (!str || str === "") return "blank";
    const i = parseInt(str);
    if (isNaN(i)) return "nan";
    if (i.toString() !== str) return "nan";
    if (i < 0) return "neg";
    return i % 2 === 0 ? "even" : "odd";
};

module.exports = hammock.hammock({
    init: () => ["", ""],

    render: (data) => {
       $("#prompt").text(data.prompt);
       $("#blank0").val(data.response[0]);
       $("#feedback0").text(data.parts[0].feedback ? data.parts[0].feedback.message : "");
       $("#blank1").val(data.response[1]);
       $("#feedback1").text(data.parts[1].feedback ? data.parts[1].feedback.message : "");
    },

    read: () => {
       return [
           $("#blank0").val(),
           $("#blank1").val()
       ];
    },

    parse: data => data.map(parse)
});
```

The {@link Activity.read `read()`} function reads the DOM to capture all student response data into a
serializable object (in this case, an array with two elements). The hammock doesn't care what type of data
this is, as long as `JSON.parse(JSON.stringify(data))` is structurally the same as `data`.

The {@link Activity.init `init()`} function defines an initial object representing the state of a page with no
response data. This is called when the assignment is newly-initialized or newly-reset.

The {@link Activity.render `render()`} function changes the contents defined in the `layout` asset file based
on the {@link QuestionSpec} it is given. It should be the only function that manipulates the DOM, and it has
to be careful what changes it makes to the layout. This funciton must _always_ produce the same display given
the same information, regardless of what sequence of `render` calls have happened earlier.

The {@link Activity.parse `parse()`} function converts the object representating the state of the page into an
array of strings, which will be used as the keys for grading. In this example, it turns the array of two text
inputs into an array of two strings, either `"blank"`, `"nan"`, `"neg"`, `"even"` or `"odd"`. We'll see how
these keys are used later in `questions.json`.

package.json
------------

The first boilerplate file is `package.json`; we use NPM to install dependencies and run scripts. The `watch`
script is just for local testing.

``` json
{
  "scripts": {
    "webpack": "webpack",
    "watch": "webpack-dev-server --progress --colors"
  },
  "devDependencies": {
    "@calculemus/oli-hammock": "^0.3.0",
    "path": "^0.12.7",
    "webpack": "^3.10.0",
    "webpack-dev-server": "^2.9.7"
  }
}
```

Instead of copy-pasting this file, you probably want to start with this `package.json` file:

``` json
{
  "scripts": {
    "webpack": "webpack",
    "watch": "webpack-dev-server --progress --colors"
  }
}
```

and then run this command to get the latest version of the development dependencies:

```
npm i @calculemus/oli-hammock path webpack webpack-dev-server --save-dev
```

webpack.config.js
-----------------

Webpack is confusing and has too many options, but you should be able to just copy and paste this file. The
`devServer` part is just for local testing.

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

Running the command `npm run webpack` will create a file `dist/activity.js` which can be used directly on OLI.

Testing OLI Activities Locally
==============================

The three files above will allow Webpack to create an OLI activity; however, three other files must be present
on OLI in order for the assignment to work. If you include those files in your NPM project (or symlink them
from the OLI repository into your NPM project), you will also be able to run your activity locally with the
webpack development server.

One `activity.js` file can be connected to multiple support files to create multiple variations on the same
embedded question type, but the setup described here only allows you to test `activity.js` against a single
activity.

Here are the files you need:

 * `main.xml` - `<embed-activity/>` specification file, maybe should be a symlink to
   `$OLI_REPO/Integers/x-oli-embed-activity/evenodd.xml`.
 * `assets/Integers/webcontent/evenodd` - Path after `assets` matches the paths in `main.xml`, one of the
   directories in this chain should maybe be a symlink.
    * `layout.html` - HTML template for question.
    * `questions.json` - Question spec, conforming to {@link QuestionSpec} type.

main.xml
--------

The `main.xml` file for any hammock-based activity needs to contain at two assets, `"layout"` and
`"questions"`. The filenames don't need to actually be named `layout.html` and `questions.json`, they just
need to be `.html` and `.json` assets with the right `asset name`.

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

layout.html
-----------

The `layout.html` file defines a template for receiving student input and displaying hints and feedback. It
does not include the SUBMIT and RESET buttons.

``` html
<div>
  <p id="prompt" />
  <input type="text" id="blank0" />
  <p id="feedback0" />
  <input type="text" id="blank1" />
  <p id="feedback1" />
</div>
```

questions.json
--------------

The `questions.json` asset defines how many parts a question has (this must agree with the activity spec's
`read` function). This file includes most of the grading logic, and needs to match up to the `parse` function
defined in the {@link Activity}.

The questions.json file should either be a single {@link QuestionSpec} or a list of QuestionSpec objects.

``` json
{
  "prompt": "Enter a nonnegative even number, then a nonnegative odd number",
  "parts": [
    {
      "match": {
        "even": [true, "Correct, that's an even number."],
        "odd": "Incorrect, that's not an even number.",
        "neg": "Incorrect. That's negative; we asked for a nonnegative number.",
        "blank": "Please given an answer for this part."
      },
      "nomatch": "That's not an integer."
    },
    {
      "match": {
        "even": "Incorrect, that's not an odd number.",
        "odd": [true, "Correct, that's an odd number."],

        "neg": "Incorrect. That's negative; we asked for a nonnegative number.",
        "blank": "Please given an answer for this part."
      },
      "nomatch": "That's not an integer."
    }
  ]
}
```

Testing the activity
--------------------

With these six files in place, you can run `npm i` and `npm run watch` and then go to http://localhost:8080/
to interact with the assignment.

Modifying the webpack configuration
-----------------------------------

If you set up the `assets` directory as a symlink, and you want `npm run webpack` to put the complied file in,
say, `Integers/webcontent/evenodd/activity.js` so that it can be checked right in to SVN, then you would
change the `path` argument under `output` to `path.resolve(__dirname, "assets/Integers/webcontent/evenodd")`.
