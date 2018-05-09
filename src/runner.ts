import { SuperActivity } from "./superactivity";
import { Activity, QuestionData, PartData, FeedbackData } from "./activity";
import { QuestionInt, PartInt, QuestionsInt } from "./int";

/**
 * The {@link Runner} object is an unfortunate abstraction, mostly created because I don't quite
 * trust the {@link SuperActivity} to maintain internal data consistency, distinguish strings and
 * numbers, etc. Also because the {@link SuperActivity} defines a very general interaction protocol, 
 * and I want to document and enforce a much more rigid protocol for the sake of simplicity. The role
 * that the Runner plays in the Hammock is therefore similar to the role the SuperActivity plays in
 * other embedded activities.
 *
 * There's no clear rule for what belongs in this class, versus what belongs in the {@link hammock}
 * function, as this object should be created, and its methods should be used, only from within that
 * funciton.
 *
 * A {@link Runner} object is created by the hammock. The constructor loads all the question's
 * compiled data, and then the {@link initializeWithSavedData} method loads the runtime data,
 * figuring out whether this activity was previously initialized.
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
    private userData: Promise<UserDefinedData>;
    private feedback: (FeedbackData | null)[];
    private question: QuestionInt;

    /**
     * Construct a Runner object and cause it to begin initializing with saved data.
     * 
     * @param superActivity - An initialized {@link SuperActivity}
     * @param activity - The activity's internal logic
     * @param questionArray - The activity's metadata (from question.json).
     */
    constructor(superActivity: SuperActivity, activity: Activity<UserDefinedData>, question: QuestionInt) {
        this.superActivity = superActivity;
        this.activity = activity;
        this.question = question;

        /** 
         * The superActivity's information about attempt number and status is only correct immediately
         * after initialization. Therefore, we record this information in the Runner on initialization,
         * and maintain it there.
         */
        this.currentAttempt = parseInt(superActivity.currentAttempt.toString()); // Turn "3" and 3.0 to 3.0

        /**
         * We have to read the program state to find out if we're using stored user data, or initializing
         * new user data. FIRST, parse the file records into a temporary data structure.
         */
        const fileRecords: Map<number, Set<string>> = new Map();
        $(this.superActivity.sessionData)
            .find("storage file_directory file_record")
            .each((index, record) => {
                const attempt = parseInt($(record).find("record_context").attr("attempt") || "-1");
                const filename = $(record).attr("file_name") || "undefined";
                const records = fileRecords.get(attempt);
                if (records !== undefined) {
                    records.add(filename);
                } else {
                    fileRecords.set(attempt, new Set([filename]));
                }
            });
        const previousRecords = fileRecords.get(this.currentAttempt - 1);
        const currentRecords = fileRecords.get(this.currentAttempt);
    
        /** 
         * Look for the userData in either this attempt or the previous attempt.
         */
        const userDataAttempt = 
            currentRecords !== undefined && currentRecords.has("userdata") ? this.currentAttempt : 
            previousRecords !== undefined && previousRecords.has("userdata") ? this.currentAttempt - 1 : null;
        if (userDataAttempt === null) {
            const userData = activity.init();
            this.userData = new Promise((resolve) => {
                this.superActivity.writeFileRecord(
                    "userdata",
                    "application/json",
                    this.currentAttempt,
                    JSON.stringify(userData),
                    () => {
                    });




                    resolve(userData);
            })
        }

        if (currentRecords === undefined || !currentRecords.has()) {
            /**
             * There is no 
             */
            this.userData = new Promise((resolve) => {
                const data = activity.init();

            })
        } else {

        }
        /**
         * 
         */
        this.userData = 
    }

    private constructQuestionData(): QuestionData<UserDefinedData> {
        const questionData: QuestionData<UserDefinedData> = {
            state: this.userDataArray[this.currentIndex],
            parts: this.questionArray[this.currentIndex].parts.map((part: PartInt, i): PartData => {
                const partData: PartData = {};
                const thisFeedback = this.feedbackArray[this.currentIndex][i];
                if (part.prompt) partData.prompt = part.prompt;
                if (part.hints) partData.hints = part.hints.map(x => x); // Deep copy
                if (thisFeedback) partData.feedback = thisFeedback;
                return partData;
            })
        };

        if (this.questionArray[this.currentIndex].prompt) {
            questionData.prompt = this.questionArray[this.currentIndex].prompt;
        }
        if (this.questionArray[this.currentIndex].hints) {
            questionData.hints = this.questionArray[this.currentIndex].hints;
        }

        return questionData;
    }

    render(): void {
        this.activity.render(this.constructQuestionData());
    }

    readSavedData(): Promise<void> {
        if (this.currentAttempt === 1) return Promise.resolve();

        const savedData = new Map<string, any>();
        const promises = new Map<string, Promise<void>>();

        $(this.superActivity.sessionData)
            .find("storage file_directory file_record")
            .each((index, record) => {
                const attempt = parseInt(
                    $(record)
                        .find("record_context")
                        .attr("attempt") || "-1"
                );
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
                this.userDataArray = savedData.get("userdata");
                this.feedbackArray = savedData.get("feedback");
            });
        } else {
            console.error(`Runner.readSavedData: Attempt ${this.currentAttempt}, no saved data`);
            return Promise.resolve();
        }
    }

    private grade(): (FeedbackData | null)[] {
        return this.activity.parse(this.userDataArray[this.currentIndex]).map((response, i) => {
            if (!response) return null;

            const match = this.questionArray[this.currentIndex].parts[i].match.get(response);
            if (!match) {
                const nomatch = this.questionArray[this.currentIndex].parts[i].nomatch;
                if (!nomatch) throw new Error(`grade: question ${i} has no match for ${response}`);

                return {
                    correct: nomatch.score === this.questionArray[this.currentIndex].parts[i].score,
                    score: nomatch.score,
                    message: nomatch.message
                };
            } else {
                return {
                    correct: match.score === this.questionArray[this.currentIndex].parts[i].score,
                    score: match.score,
                    message: match.message
                };
            }
        });
    }

    submit(): void {
        this.userDataArray[this.currentIndex] = this.activity.read();
        this.feedbackArray[this.currentIndex] = this.grade();

        const pointsEarned = this.feedbackArray[this.currentIndex].reduce((total, x) => {
            if (x === null) return total;
            return total + x.score;
        }, 0); /*
        // For some reason x.score was occastionally undefined, check transformation code?
        const pointsAvailable = this.questionArray[this.currentIndex].parts.reduce((total, x) => {
            return total + x.score;
        }, 0); */
        // THIS IS BOGUS
        const percentage = pointsEarned === 0 ? 0 : 100;

        this.superActivity.writeFileRecord(
            "userdata",
            "application/json",
            this.currentAttempt,
            JSON.stringify(this.userDataArray),
            () => {
                this.superActivity.writeFileRecord(
                    "feedback",
                    "application/json",
                    this.currentAttempt,
                    JSON.stringify(this.feedbackArray),
                    () => {
                        this.superActivity.scoreAttempt(
                            "percent",
                            percentage,
                            () => {
                                this.superActivity.endAttempt(() => {
                                    this.superActivity.startAttempt((response: Element) => {
                                        const newAttempt = parseInt(
                                            $(response)
                                                .find("attempt_history")
                                                .attr("current_attempt") || "-1"
                                        );
                                        this.currentAttempt = newAttempt;
                                    });
                                });
                            }
                        );
                    }
                );
            }
        );
    }

    reset(): void {
        this.userDataArray[this.currentIndex] = this.activity.init();
        this.feedbackArray[this.currentIndex] = this.questionArray[this.currentIndex].parts.map(() => null);

        this.superActivity.writeFileRecord(
            "reset",
            "application/json",
            this.currentAttempt,
            JSON.stringify(this.userDataArray),
            () => {
                this.superActivity.endAttempt(() => {
                    this.superActivity.startAttempt((response: Element) => {
                        const newAttempt = parseInt(
                            $(response)
                                .find("attempt_history")
                                .attr("current_attempt") || "-1"
                        );
                        this.currentAttempt = newAttempt;
                    });
                });
            }
        );
    }
}
