import { SuperActivity } from "./superactivity";
import { Activity, QuestionData, PartData, FeedbackData } from "./activity";
import { QuestionInt, PartInt } from "./int";

export class Runner<UserDefinedData> {
    private currentIndex: number;
    private currentAttempt: number;
    private activity: Activity<UserDefinedData>;
    private superActivity: SuperActivity;
    private userDataArray: UserDefinedData[];
    private feedbackArray: (FeedbackData | null)[][];
    private questionArray: QuestionInt[];

    constructor(
        activity: Activity<UserDefinedData>,
        superActivity: SuperActivity,
        activityData: Element,
        questionArray: QuestionInt[]
    ) {
        this.activity = activity;
        this.superActivity = superActivity;
        if (superActivity.currentAttempt === "none") {
            setTimeout(() => console.error(`Delayed: ${superActivity.currentAttempt}`), 5000);
            throw new Error("Error in superactivity: currentAttempt non-numeric");
        }
        this.currentAttempt = parseInt(superActivity.currentAttempt.toString());

        this.currentIndex = 0;
        this.questionArray = questionArray;
        this.userDataArray = questionArray.map(() => activity.init());
        this.feedbackArray = questionArray.map(question => question.parts.map(() => null));
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
                        // There are new functions logCorrect, logIncorrect, logHint, logComplete
                        // We'll need to update a spreadsheet somewhere that maps question+part to skill
                        /*
                        for (part in Question) {
                            const qid = // GET QUESTION INFO FROM SUPERACTIVITY
                            if (correct) {
                               logCorrect(qid);
                            } else {
                               logIncorrect(qid);
                            }
                        }
                        */
                        this.superActivity.scoreAttempt(
                            "percent",
                            75, // XX TODO FIX
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
