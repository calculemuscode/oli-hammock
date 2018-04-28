import { SuperActivity } from "./superactivity";
import { Activity, QuestionData, PartData, FeedbackData } from "./activity";
import { QuestionInt, PartInt } from "./int";

/**
 * The {@link Runner} object is an unfortunate abstraction, mostly created because I don't quite
 * trust the {@link SuperActivity} to maintain internal data consistency and distinguish strings and
 * numbers, and because the {@link SuperActivity} defines a very general interaction protocol, and
 * I want to document and enforce a much more rigid protocol for the sake of simplicity. The role
 * that the Runner plays in the Hammock is therefore similar to the role the SuperActivity plays in
 * other embedded activities.
 *
 * There's no clear rule for what belongs in this class, versus what belongs in the {@link hammock}
 * function, as this method only gets called from within that funciton.
 *
 * A {@link Runner} object is created by the hammock. The constructor loads all the question's
 * compiled data, and then the {@link initializeWithSavedData} method loads the runtime data,
 * figuring out which of the four possible states it is in:
 *
 *  - Freshly initialized: it is Attempt 1, the assessment has never been visited before. The
 *    {@link SuperActivity} just called {@link startAttempt}.
 *  - Incomplete: the assessment was started previously, so there is existing {@link UserDefinedData}
 *    to be read in and used. There may be zero, one, ore more actual grade records for this attempt,
 *    but none of these attempts have a score of 100%.
 *  - Complete: the most recent attempt recieved a score of 100%. Activity submission is disabled
 *    until the RESET button is pushed.
 */
export class Runner<UserDefinedData> {
    private currentAttempt: number;
    private activity: Activity<UserDefinedData>;
    private superActivity: SuperActivity;
    private userData: UserDefinedData;
    private feedback: (FeedbackData | null)[];
    private question: QuestionInt; // feedback.length === question.parts.length
    private completed: boolean;
    private initialized: Promise<void>;

    private verbose: boolean = true;
    private log(msg: () => string) {
        if (this.verbose) {
            console.log(`Runner: ${msg()}`);
        }
    }

    /**
     * Constructs a Runner object which then needs to be immediately initialized with
     * the {@link initializeWithSavedData} method.
     *
     * @param superActivity - an initialized superActivity
     * @param activity - the activity's internal logic
     * @param question - the activity's metadata (from question.json)
     */
    constructor(superActivity: SuperActivity, activity: Activity<UserDefinedData>, question: QuestionInt) {
        this.activity = activity;
        this.superActivity = superActivity;

        if (superActivity.currentAttempt === "none") {
            throw new Error("Error in superactivity: currentAttempt non-numeric");
        }
        // Don't trust superActivity to consistently give us "3" vs. 3
        this.currentAttempt = parseInt(superActivity.currentAttempt.toString());

        // superActivity's record is only correct immediately after initialization
        this.completed = superActivity.isCurrentAttemptCompleted();

        this.question = question;
        this.userData = activity.init();
        this.feedback = question.parts.map(() => null);
        this.initialized = this.initializeFromSavedData();
    }

    /**
     * Figures out
     *
     * Use the superActivity's list of files to finish initialization of the
     *
     * When an activity is first initialized, XXX what?
     *
     * If the activity is revisitied,
     *
     * On subsequet initializations, we'll either be reloading an
     */
    private initializeFromSavedData(): Promise<void> {
        this.log(() => `initializeWithSavedData on attempt ${this.currentAttempt}`);
        const savedData = new Map<string, any>();
        const promises = new Map<string, Promise<void>>();

        const sessionData = $(this.superActivity.sessionData).find("storage file_directory file_record");
        this.log(() => `sessionData is ${sessionData.text}`);
        sessionData.each((index, record) => {
            const attempt = parseInt(
                $(record)
                    .find("record_context")
                    .attr("attempt") || "-1"
            );
            this.log(() => `reading attempt ${attempt}`);
            const filename = $(record).attr("file_name") || "undefined";
            if (attempt === this.currentAttempt - 1) {
                promises.set(
                    filename,
                    new Promise(resolve => {
                        this.superActivity.loadFileRecord(
                            filename,
                            this.currentAttempt - 1,
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
            return Promise.resolve();
        } else if (promises.has("userdata") && promises.has("feedback")) {
            return Promise.all(promises.values()).then(() => {
                this.userData = savedData.get("userdata");
                this.feedback = savedData.get("feedback");
            });
        } else {
            console.error(`Runner.readSavedData: Attempt ${this.currentAttempt}, no saved data`);
            return Promise.resolve();
        }
    }

    private constructQuestionData(): QuestionData<UserDefinedData> {
        const questionData: QuestionData<UserDefinedData> = {
            state: this.userData,
            parts: this.question.parts.map((part: PartInt, i): PartData => {
                const partData: PartData = {};
                const thisFeedback = this.feedback[i];
                if (part.prompt) partData.prompt = part.prompt;
                if (part.hints) partData.hints = part.hints.map(x => x); // Deep copy
                if (thisFeedback) partData.feedback = thisFeedback;
                return partData;
            })
        };

        if (this.question.prompt) {
            questionData.prompt = this.question.prompt;
        }
        if (this.question.hints) {
            questionData.hints = this.question.hints;
        }

        return questionData;
    }

    public render(): void {
        this.initialized.then(() => {
            if (this.completed) {
                $("#hammocksubmit").attr("disabled", "disabled");
            } else {
                $("#hammocksubmit").removeAttr("disabled");
            }
            this.activity.render(this.constructQuestionData());
        });
    }

    private grade(): (FeedbackData | null)[] {
        return this.activity.parse(this.userData).map((response, i) => {
            if (!response) return null;

            const match = this.question.parts[i].match.get(response);
            if (!match) {
                const nomatch = this.question.parts[i].nomatch;
                if (!nomatch) throw new Error(`grade: question ${i} has no match for ${response}`);

                return {
                    correct: nomatch.score === this.question.parts[i].score,
                    score: nomatch.score,
                    message: nomatch.message
                };
            } else {
                return {
                    correct: match.score === this.question.parts[i].score,
                    score: match.score,
                    message: match.message
                };
            }
        });
    }

    public submit(): Promise<void> {
        return this.initialized.then(() => {
            return new Promise<void>(resolve => {
                this.userData = this.activity.read();
                this.feedback = this.grade();

                const pointsEarned = this.feedback.reduce((total, x) => {
                    if (x === null) return total;
                    return total + x.score;
                }, 0);
                const pointsAvailable = this.question.parts.reduce((total, x) => {
                    return total + x.score;
                }, 0);
                const percentage = Math.floor(100 * pointsEarned / pointsAvailable);

                this.superActivity.writeFileRecord(
                    "userdata",
                    "application/json",
                    this.currentAttempt,
                    JSON.stringify(this.userData),
                    () => {
                        this.superActivity.writeFileRecord(
                            "feedback",
                            "application/json",
                            this.currentAttempt,
                            JSON.stringify(this.feedback),
                            () => {
                                this.superActivity.scoreAttempt("percent", percentage, () => {
                                    console.log(`Recording ${percentage}% complete`);
                                    /* If the assignment is not complete (100% score), we keep it open.
                                     * if the assignment is complete, we end the attempt, disable the
                                     * submit button, and only allow a new attempt to begin if the
                                     * student resets the activity. */
                                    if (percentage === 100) {
                                        this.superActivity.endAttempt(() => {
                                            this.completed = true;
                                            console.log("Activity disabled");
                                            resolve();
                                        });
                                    } else {
                                        resolve();
                                    }
                                });
                            }
                        );
                    }
                );
            });
        });
    }

    public reset(): Promise<void> {
        return this.initialized.then(() => {
            return new Promise<void>(resolve => {
                this.userData = this.activity.init();
                this.feedback = this.question.parts.map(() => null);

                this.superActivity.writeFileRecord(
                    "reset",
                    "application/json",
                    this.currentAttempt,
                    JSON.stringify(this.userData),
                    () => {
                        if (this.completed) {
                            this.superActivity.startAttempt((response: Element) => {
                                const newAttempt = parseInt(
                                    $(response)
                                        .find("attempt_history")
                                        .attr("current_attempt") || "-1"
                                );
                                this.currentAttempt = newAttempt;
                                console.log(`Activity re-enabled: new attempt ${newAttempt}`);
                                this.completed = false;
                                resolve();
                            });
                        } else {
                            this.superActivity.endAttempt(() => {
                                this.superActivity.startAttempt((response: Element) => {
                                    const newAttempt = parseInt(
                                        $(response)
                                            .find("attempt_history")
                                            .attr("current_attempt") || "-1"
                                    );
                                    console.log(`Activity refreshed: current attempt ${newAttempt}`);
                                    this.currentAttempt = newAttempt;
                                    resolve();
                                });
                            });
                        }
                    }
                );
            });
        });
    }
}
