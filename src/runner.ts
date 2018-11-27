import { SuperActivity, ActionLog } from "./superactivity";
import {
    Activity,
    QuestionData,
    PartData,
    FeedbackData,
    STATUS_CORRECT,
    STATUS_INCORRECT,
    STATUS_NOT_FOUND
} from "./activity";
import { QuestionInt, PartInt } from "./validateinput";
import * as mustache from "mustache";

declare const ActionLog: any;
declare const SupplementLog: any;

/**
 * The {@link Runner} object is an unfortunate bit of @internalapi, mostly created because I don't quite
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
    private question: QuestionInt;

    /**
     * A promise is used to avoid initializing with dummy data unnecessarily.
     */
    private stored: Promise<{ state: UserDefinedData; feedback: (FeedbackData | null)[] }>;

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
                const attempt = parseInt(
                    $(record)
                        .find("record_context")
                        .attr("attempt") || "-1"
                );
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
         * SECOND, if there's no "state" record, start from scratch. Otherwise, load it.
         */
        if (currentRecords === undefined || !currentRecords.has("state")) {
            this.stored = Promise.resolve({
                state: activity.init(undefined, question.config),
                feedback: question.parts.map(x => null)
            });
        } else {
            const state: Promise<UserDefinedData> = new Promise(resolve => {
                this.superActivity.loadFileRecord("state", this.currentAttempt, resolve);
            });

            /**
             * THIRD, if there's a "feedback" record in the current attempt, load them.
             */
            let feedback: Promise<(FeedbackData | null)[]>;
            if (previousRecords !== undefined && previousRecords.has("feedback")) {
                feedback = new Promise(resolve => {
                    this.superActivity.loadFileRecord("feedback", this.currentAttempt - 1, resolve);
                });
            } else {
                feedback = Promise.resolve(question.parts.map(x => null));
            }
            this.stored = Promise.all([state, feedback]).then(([state, feedback]) => ({
                state: state,
                feedback: feedback
            }));
        }
    }

    render(): Promise<void> {
        return this.stored.then(({ state, feedback }) => {
            const questionData: QuestionData<UserDefinedData> = {
                prompt: this.question.prompt,
                hints: this.question.hints,
                config: this.question.config,
                state: state,
                parts: this.question.parts.map(
                    (part: PartInt, i): PartData => {
                        return {
                            prompt: part.prompt,
                            hints: part.hints ? part.hints.map(x => x) : [],
                            feedback: feedback[i] || undefined
                        };
                    }
                )
            };

            // Re-render display
            this.activity.render(questionData);
        });
    }

    private grade(state: UserDefinedData, config: any): (FeedbackData | null)[] {
        return this.activity.parse(state, config).map((response, i) => {
            if (!response) return null;
            const view = typeof response === "string" ? { key: response } : response;

            let match = this.question.parts[i].match.get(view.key);
            if (match) {
                return {
                    key: view.key,
                    status: match.score >= this.question.parts[i].score ? STATUS_CORRECT : STATUS_INCORRECT,
                    score: Math.min(this.question.parts[i].score, match.score),
                    message: mustache.render(match.message, view)
                };
            }

            match = this.question.match.get(view.key);
            if (match) {
                return {
                    key: view.key,
                    status: match.score >= this.question.parts[i].score ? STATUS_CORRECT : STATUS_INCORRECT,
                    score: Math.min(this.question.parts[i].score, match.score),
                    message: mustache.render(match.message, view)
                };
            }

            return {
                key: view.key,
                status: STATUS_NOT_FOUND,
                score: 0,
                message: view.key
            };
        });
    }

    private write<A>(name: string, x: A): Promise<A> {
        return new Promise(resolve => {
            this.superActivity.writeFileRecord(
                name,
                "application/json",
                this.currentAttempt,
                JSON.stringify(x),
                () => resolve(x)
            );
        });
    }

    private restart(): Promise<void> {
        return new Promise(resolve => {
            this.superActivity.endAttempt(resolve);
        })
            .then(
                () =>
                    new Promise<Element>(resolve => {
                        this.superActivity.startAttempt(resolve);
                    })
            )
            .then(response => {
                const reportedNewAttempt = $(response)
                    .find("attempt_history")
                    .attr("current_attempt");
                const newAttempt = parseInt(reportedNewAttempt || "-1");
                this.currentAttempt = newAttempt;
            });
    }

    submit(): Promise<void> {
        this.stored = this.stored.then(() => {
            const state = this.activity.read();
            return { state: state, feedback: this.grade(state, this.question.config) };
        });
        return this.stored.then(({ state, feedback }) => {
            const pointsEarned = feedback.reduce((total, x) => {
                if (x === null) return total;
                return total + x.score;
            }, 0);
            const pointsAvailable = this.question.parts.reduce((total, x) => total + x.score, 0);
            const percentage = Math.min(100, Math.floor((100 * pointsEarned) / pointsAvailable));

            // Part logging
            const dashboardLogging: Promise<void>[] = feedback.map((value, part) => {
                if (value === null) return Promise.resolve();
                const step = `p${part + 1}`;
                return new Promise(resolve => {
                    const action = new ActionLog(
                        "SUBMIT_ATTEMPT",
                        this.superActivity.sessionId,
                        this.superActivity.resourceId,
                        this.superActivity.activityGuid,
                        "OLI_HAMMOCK_ACTIVITY",
                        this.superActivity.timeZone
                    );

                    const trackingSupplement = new SupplementLog();
                    trackingSupplement.setAction("EVALUATE_RESPONSE_TRACK");
                    trackingSupplement.setSource("question");
                    trackingSupplement.setInfoType(step);
                    trackingSupplement.setInfo(`${percentage === 100}`);
                    action.addSupplement(trackingSupplement);

                    const dataSupplement = new SupplementLog();
                    dataSupplement.setAction("EVALUATE_QUESTION");
                    dataSupplement.setSource("question");
                    dataSupplement.setInfoType(step);
                    dataSupplement.setInfo(value.key);
                    action.addSupplement(dataSupplement);

                    this.superActivity.logAction(action, resolve);
                });
            });

            // Core OLI logging
            return Promise.all(dashboardLogging)
                .then(() => this.write("state", state))
                .then(
                    () =>
                        new Promise(resolve => {
                            this.superActivity.scoreAttempt("percent", percentage, resolve);
                        })
                )
                .then(() => this.write("feedback", feedback))
                .then(() => this.restart())
                .then(() => this.write("state", state))
                .then(() => {});
        });
    }

    reset(): Promise<void> {
        this.stored = this.stored.then(({ feedback }) => {
            const state = this.activity.read();
            return { state: state, feedback: feedback };
        });
        this.stored = this.stored.then(({ state, feedback }) => {
            return this.write("reset", state)
                .then(() => this.restart())
                .then(() => {
                    const newState = this.activity.init(state, this.question.config);
                    return this.write("state", newState);
                })
                .then(newState => ({ state: newState, feedback: this.question.parts.map(() => null) }));
        });
        return this.stored.then(() => {});
    }
}

$(window.parent).focus;
