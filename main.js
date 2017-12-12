function validateQuestions(questions) {
    return Array.isArray(questions)
        ? questions.map(validateQuestion)
        : [validateQuestion(questions)];
}

function validateQuestion(question) {
    if (typeof(question) !== "object") {
        throw new Error("validateQuestion: question not an object");
    }
    if (question.hasOwnProperty("prompt") && "string" !== typeof(question.prompt)) {
        throw new Error("validateQuestion: prompt not a string");
    }
    if (question.hasOwnProperty("parts") && question.hasOwnProperty("part")) {
        throw new Error("validateQuestion has both part and parts fields");
    }
    if (!question.hasOwnProperty("parts") && !question.hasOwnProperty("part")) {
        throw new Error("validateQuestion has neither part nor parts fields");
    }

    return {
        prompt: question.prompt,
        parts: question.parts
            ? question.parts.map(validatePart)
            : [ validatePart(question.part) ]
    }
}

function validatePart(part) {
    if (typeof(part) !== "object") {
        throw new Error("validatePart: part not an object");
    }
    if (part.hasOwnProperty("score") && "number" !== typeof(part.score)) {
        throw new Error("validatePart: no score for part")
    }
    if (part.hasOwnProperty("score") && part.score <= 0) {
        throw new Error("validatePart: score must be strictly positive");
    }
    // Validate more?
    return {
        score: part.score || 1,
        match: Object.keys(part.match).reduce((newMatch, key) => {
            newMatch[key] = validateMatch(part.match[key]);
            return newMatch;
        }, {}),
        nomatch: validateMatch(part.nomatch),
        hints: part.hints
    };
}

function validateMatch(match) {
    if (typeof(match) === "string") {
        return [0, match];
    }
    // Validate more?
    return match;
}

module.exports.simple = function (activity) {
    return {
        init: function (superActivity, activityData) {
            const webContentFolder = (superActivity && superActivity.webContentFolder) || "./assets/";

            const title = $(activityData).find("title").text();
            const assets = new Map();
            const promises = new Set();

            $(activityData).find("assets asset").each(function(i, asset) {
                const name = $(asset).attr("name");
                const value = $(asset).text();

                // Convert the assets into a map
                if (assets.has(name)) {
                    console.error("Multiple assets named " + name);
                    console.error("Asset being discarded: " + value);
                } else {
                    const i = value.lastIndexOf(".");
                    const c = i == -1 ? "" : value.substring(i);
                    assets.set(name, value);

                    // Replace some assets with complete paths or with the actual content
                    switch (c) {
                        case ".json":
                        promises.add(new Promise((resolve, reject) => {
                            $.get(webContentFolder + value, content => {
                                assets.set(name, content);
                                resolve();
                            })
                        }));
                        break;

                        case ".html":
                        promises.add(new Promise((resolve, reject) => {
                            $.get(webContentFolder + value, content => {
                                assets.set(name, content);
                                resolve();
                            })
                        }));

                        case ".css":
                        assets.set(name, Promise.resolve(webContentFolder + value));
                        break;
                    }
                }
            });

            Promise.all(promises).then(() => {
                if (assets.has("layout")) {
                    $("#oli-embed").append(assets.get("layout"));
                }

                $("<link/>", {
                    rel: "stylesheet",
                    type: "text/css",
                    href: "https://maxcdn.bootstrapcdn.com/bootstrap/3.3.5/css/bootstrap.min.css"
                }).appendTo("head");

                let questions = validateQuestions(assets.get("questions"));
                let currentIndex = 0;
                let currentQuestion = $.extend(true, {}, questions[currentIndex]);

                const btnSubmit = $("<button/>", {
                    class: "btn btn-primary btn-sm",
                    text: "SUBMIT",
                    click: action => {
                        currentResponses = activity.read();
                        const parseResponses = Array.isArray(activity.parse)
                            ? currentResponses.map((x, i) => activity.parse[i](x))
                            : currentResponses.map(activity.parse);

                        const analysis = currentQuestion.parts.map((part, i) => {
                            const response = parseResponses[i];
                            if (part.match.hasOwnProperty(response)) {
                                return {
                                    correct: part.match[response][0] === part.score,
                                    score: part.match[response][0],
                                    feedback: part.match[response][1]
                                };
                            } else {
                                return {
                                    correct: part.nomatch[0] === part.score,
                                    score: part.nomatch[0],
                                    feedback: part.nomatch[1]
                                };
                            }
                        });

                        currentQuestion.parts.map((part, i) => {
                            part.response = currentResponses[i];
                            part.analysis = analysis[i];
                        });

                        activity.render(currentQuestion);
                    }
                });

                const btnReset = $("<button/>", {
                    class: "btn btn-primary btn-sm",
                    text: "RESET",
                    click: () => {
                        currentQuestion = $.extend(true, {}, questions[currentIndex]);
                        activity.render(currentQuestion);
                    }
                });

                $("#oli-embed").append(btnSubmit).append(btnReset);

                if (typeof activity == "function") {
                    activity = activity(assets);
                }

                activity = activity ? activity : {};
                if (!activity.then) {
                    activity.render && activity.render(currentQuestion);
                } else {
                    activity.then(() => activity.render && activity.render(currentQuestion));
                }
            });
        }
    };
};
