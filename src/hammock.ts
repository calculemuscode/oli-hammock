import { SuperActivity, SuperActivityClient } from "./superactivity";
import { Activity, QuestionData, PartData, FeedbackData } from "./activity";
import { readAssets } from "./assets";
import { QuestionInt, QuestionsInt, PartInt, validateQuestions } from "./int";

/**
 * Attach boilerplate elements to the page
 */
function initializeHTML(assets: Map<string, Element>): void {
    // Always attach bootstrap to page (kind of ugly)
    $("<link/>", {
        rel: "stylesheet",
        type: "text/css",
        href: "https://maxcdn.bootstrapcdn.com/bootstrap/3.3.5/css/bootstrap.min.css"
    }).appendTo("head");

    // Attach layout assets to page
    const layout = assets.get("layout");
    if (layout) $("#oli-embed").append(layout);
}

/**
 * Implements the grading match-up logic
 */
function grade(question: QuestionInt, responses: (string | null)[]): (FeedbackData | null)[] {
    return responses.map((response, i) => {
        if (!response) return null;

        const match = question.parts[i].match.get(response);
        if (!match) {
            const nomatch = question.parts[i].nomatch;
            if (!nomatch) throw new Error(`grade: question ${i} has no match for ${response}`);

            return {
                correct: nomatch.score === question.parts[i].score,
                score: nomatch.score,
                message: nomatch.message
            };
        } else {
            return {
                correct: match.score === question.parts[i].score,
                score: match.score,
                message: match.message
            };
        }
    });
}

function constructQuestionData<UserDefinedData>(
    question: QuestionInt,
    user: UserDefinedData,
    feedback: (FeedbackData | null)[]
): QuestionData<UserDefinedData> {
    const questionData: QuestionData<UserDefinedData> = {
        state: user,
        parts: question.parts.map((part: PartInt, i): PartData => {
            const partData: PartData = {};
            const thisFeedback = feedback[i];
            if (part.prompt) partData.prompt = part.prompt;
            if (part.hints) partData.hints = part.hints.map(x => x); // Deep copy
            if (thisFeedback) partData.feedback = thisFeedback;
            return partData;
        })
    };

    if (question.prompt) questionData.prompt = question.prompt;
    if (question.hints) questionData.hints = question.hints.map(x => x);

    return questionData;
}

function readSavedData<UserDefinedData>(
    activity: Activity<UserDefinedData>,
    superActivity: SuperActivity,
    activityData: Element,
    questionArray: QuestionsInt
): Promise<{ userdata: UserDefinedData[]; feedback: (FeedbackData | null)[][]; question: QuestionsInt }> {
    const defaults = () =>
        Promise.resolve({
            userdata: questionArray.map(() => activity.init()),
            feedback: questionArray.map(question => question.parts.map(() => null)),
            question: questionArray
        });

    if (typeof superActivity.currentAttempt === "string") {
        superActivity.currentAttempt = parseInt(superActivity.currentAttempt);
    }

    if (superActivity.currentAttempt == 1) {
        return defaults();
    }

    const savedData = new Map<string, any>();
    const promises = new Map<string, Promise<void>>();

    $(superActivity.sessionData)
        .find("storage file_directory file_record")
        .each((index, record) => {
            const attempt = parseInt(
                $(record)
                    .find("record_context")
                    .attr("attempt") || "-1"
            );
            const filename = $(record).attr("file_name") || "undefined";
            if (attempt + 1 === superActivity.currentAttempt) {
                promises.set(
                    filename,
                    new Promise(resolve => {
                        superActivity.loadFileRecord(
                            filename,
                            parseInt(superActivity.currentAttempt.toString()) - 1, // xxx redundant parseInt
                            (result: any) => {
                                savedData.set(filename, result);
                                resolve();
                            }
                        );
                    })
                );
            }
        });

    if (promises.has("reset")) {
        return defaults();
    } else if (promises.has("userdata") && promises.has("feedback")) {
        return Promise.all(promises.values()).then(() => ({
            userdata: savedData.get("userdata"),
            feedback: savedData.get("feedback"),
            question: questionArray
        }));
    } else {
        console.error("Not first attempt, but there is no saved data");
        return defaults();
    }
}

export function hammock<UserDefinedData>(activity: Activity<UserDefinedData>): SuperActivityClient {
    return {
        init: function(superActivity: SuperActivity, activityData: Element) {
            if (superActivity.currentAttempt === "none") {
                setTimeout(() => console.log(`Delayed: ${superActivity.currentAttempt}`), 5000);
                throw new Error("Error in superactivity: currentAttempt non-numeric");
            }

            readAssets(superActivity.webContentFolder, activityData)
                .then(assets => {
                    initializeHTML(assets);

                    // XXX TODO: deal with possibility of a nonexistant questions asset (default or error)?
                    return readSavedData(
                        activity,
                        superActivity,
                        activityData,
                        validateQuestions(assets.get("questions"))
                    );
                })
                .then(data => {
                    let currentIndex = 0;
                    const userDataArray = data.userdata;
                    const feedbackArray = data.feedback;
                    const questionArray = data.question;

                    const render = () =>
                        activity.render(
                            constructQuestionData(
                                questionArray[currentIndex],
                                userDataArray[currentIndex],
                                feedbackArray[currentIndex]
                            )
                        );

                    const btnSubmit: JQuery<HTMLElement> = $("<button/>", {
                        class: "btn btn-primary btn-sm",
                        text: "SUBMIT",
                        click: (): void => {
                            userDataArray[currentIndex] = activity.read();
                            feedbackArray[currentIndex] = grade(
                                questionArray[currentIndex],
                                activity.parse(userDataArray[currentIndex])
                            );

                            superActivity.writeFileRecord(
                                "userdata",
                                "application/json",
                                superActivity.currentAttempt,
                                JSON.stringify(userDataArray),
                                () => {
                                    superActivity.writeFileRecord(
                                        "feedback",
                                        "application/json",
                                        superActivity.currentAttempt,
                                        JSON.stringify(feedbackArray),
                                        () => {
                                            superActivity.scoreAttempt(
                                                "percent",
                                                75, // XX TODO FIX
                                                () => {
                                                    superActivity.endAttempt(() => {
                                                        superActivity.startAttempt((response: Element) => {
                                                            const newAttempt = parseInt(
                                                                $(response)
                                                                    .find("attempt_history")
                                                                    .attr("current_attempt") || "-1"
                                                            );
                                                            superActivity.currentAttempt = newAttempt;
                                                        });
                                                    });
                                                }
                                            );
                                        }
                                    );
                                }
                            );

                            render();
                        }
                    });

                    const btnReset: JQuery<HTMLElement> = $("<button/>", {
                        class: "btn btn-primary btn-sm",
                        text: "RESET",
                        click: () => {
                            userDataArray[currentIndex] = activity.init();
                            feedbackArray[currentIndex] = questionArray[currentIndex].parts.map(() => null);

                            superActivity.writeFileRecord(
                                "reset",
                                "application/json",
                                superActivity.currentAttempt,
                                JSON.stringify(userDataArray),
                                () => {
                                    superActivity.endAttempt(() => {
                                        superActivity.startAttempt((response: Element) => {
                                            const newAttempt = parseInt(
                                                $(response)
                                                    .find("attempt_history")
                                                    .attr("current_attempt") || "-1"
                                            );
                                            superActivity.currentAttempt = newAttempt;
                                        });
                                    });
                                }
                            );

                            render();
                        }
                    });

                    $("#oli-embed")
                        .append(btnSubmit)
                        .append(btnReset);

                    render();
                });
        }
    };
}
