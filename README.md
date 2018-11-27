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

Quick Start
===========

You can create and start a hammock project by running the following commands, replacing `my_project` with any name you want for your project. The `create-oli-hammock` script will ask you a number of questions, but it is okay to accept all the default answers by pressing the Enter key.

```
npx create-oli-hammock my_project
cd my_project
npm install
npm run watch
```

This starts a test version of a project where you can view it [on your local computer](http://localhost:8080/).

Pieces of a Project
===================

The default `create-oli-hammock` project contains several files that you won't need to edit:

 * `main.ts` - this is just an entry point into the code you will write
 * `main.xml` - this is used by the Hammock and by OLI to find the pieces of your activity
 * `node_modules` - this directory is automatically created and managed by NPM
 * `package-lock.json` - this file is automatically managed by NPM
 * `tsconfig.json` - this file tells Typescript how the project is built
 * `webpack.config.json` - this tells Hammock how to run your file locally, and how to build it for OLI

You probably won't need to muck about with `package.json` either, at least at first.

The files you want to immediately look at are these three:

 * `activity.ts`
 * `assets/webcontent/my_project/layout.html` (but with `my_project` replaced by the name you gave to `create-oli-hammock`)
 * `assets/webcontent/my_project/questions.json` (but with `my_project` replaced by the name you gave to `create-oli-hammock`)

Let's look at those three files:

activity.ts
-----------

The `activity.ts` creates a single {@link Activity} object. The documentation for {@link Activity}, especially the documentation 
for its three methods {@link Activity.init `init()`}, {@link Activity.parse `parse()`}, {@link Activity.read `read()`}, and {@link Activity.render `render()`}, are where you should start when trying
to understand Hammock.

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
array of strings, which will be used as the keys for grading. These keys appear again later in `questions.json`.

layout.html
-----------

The `layout.html` file defines a template for receiving student input and displaying hints and feedback. It
does not include the SUBMIT and RESET buttons; those get added automatically by Hammock.

questions.json
--------------

The `questions.json` asset defines how many parts a question has (this must agree with the activity spec's
`read` function). This file includes most of the grading logic, and needs to match up to the `parse` function
defined in the {@link Activity}.

The questions.json file should contain data that matches the description of a {@link QuestionSpec}.
```

OLI Hammock Commands
====================

`npm run watch` starts your activity running locally, at http://localhost:8080.

`npm run dist` starts your activity running on the internet where you can share it, using the free functionality of [surge.sh](https://surge.sh/). If this doesn't work (for instance, because your project name is taken already), you may need to edit the URL that surge will try to publish to in `package.json`. (The address still needs to be a surge.sh address, like somethingorother.surge.sh).

`npm run deploy` only works if you provided an OLI project repository root when you first ran `create-oli-hammock`. If you did this, then this will deploy your activity into that OLI project repository.