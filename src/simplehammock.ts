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
        response: user,
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

export function simple<UserDefinedData>(activity: Activity<UserDefinedData>): SuperActivityClient {
    return {
        init: function(superActivity: SuperActivity, activityData: Element) {
            readAssets(superActivity.webContentFolder, activityData).then(assets => {
                initializeHTML(assets);

                // XXX TODO: deal with possibility of a nonexistant questions asset (default or error)?
                const questionArray: QuestionsInt = validateQuestions(assets.get("questions"));

                // XXX TODO: see if there's existing UserDefinedData in the OLI database that would cause us
                // to revise these defaults.
                let currentIndex = 0;
                let userDataArray: UserDefinedData[] = questionArray.map(() => activity.init());
                let feedbackArray: (FeedbackData | null)[][] = questionArray.map(question =>
                    question.parts.map(() => null)
                );

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
                        render();
                    }
                });

                const btnReset: JQuery<HTMLElement> = $("<button/>", {
                    class: "btn btn-primary btn-sm",
                    text: "RESET",
                    click: () => {
                        userDataArray[currentIndex] = activity.init();
                        feedbackArray[currentIndex] = questionArray[currentIndex].parts.map(() => null);
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
