/**
 * QuestionData is passed to the embedded {@link Activity Activity's} render() function, giving instructions
 * for rendering the entire question into the template.
 */
export interface QuestionData<UserDefinedData> {
    prompt?: string;

    /**
     * Data associated with individual parts of the question, including the grader's analysis.
     */
    parts: PartData[];

    /**
     * The stored state of this question.
     */
    state: UserDefinedData;

    /**
     * Any hints associated with the question as a whole. (Does not store the state of
     * hints; this state must be placed in the UserDefinedData in order to persist.)
     */
    hints?: string[];
}

/**
 * The results from the grader's analysis of a part are stored in the PartData object.
 */
export interface PartData {
    prompt?: string;

    /**
     * Any hints associated with this part of the {@link QuestionData question}. (Does not store the state of
     * hints; this state must be placed in the UserDefinedData in order to persist.)
     */
    hints?: string[];

    /**
     * If the `analysis` field exists, then this part has been graded.
     */
    feedback?: FeedbackData;
}

export interface FeedbackData {
    correct: boolean | "info";
    score: number;
    message: string;
}

/**
 * An Activity object is what the OLI activity creater writes in order to build an embedded activity. This
 * Activity object will get passed to the OLI Hammock in order to build a complete activtiy that can be run
 * inside of OLI.
 *
 * The state of the question is stored in a seralizable object {@link UserDefinedData}, containing all the
 * information about the current state of the student's responses to that question. The implementer of the
 * Activity and the Activity's internal code know what this UserDefinedData is, but the OLI Hammock code 
 * treats it as an abstract type.
 */
export interface Activity<UserDefinedData> {
    /**
     * Renders the question state into the template by writing into the DOM. This is the only function that
     * should ever modify the DOM. This function should NOT modify the {@link data} object in any way.
     *
     * This must be an idempotent function: calling it twice has to have the same result as calling it
     * once. It must also be a history agnostic function: the visual result must be the same regardless of
     * whether the HTML template is freshly loaded from the assets or whether render() has been called
     * seventy-six times already with wildly different `data`.
     * 
     * This basically means that the render method must proactively set EVERY property that could possibly
     * be modified by the user or by other calls to `render()`.
     */
    render(data: QuestionData<UserDefinedData>): void;

    /**
     * Because UserDefinedData is an abstract type, an Activity must be able to generate its initial state in
     * order to initialize a new (or freshly-reset) Question. This function should not read from, or write to,
     * the DOM. (Conceptually, it might as well not even be run in the browser.)
     *
     * This function is called on freshly-initalized questions and is re-invoked whenever the function is
     * reset, so it can be used to generate randomized questions.
     */
    init(): UserDefinedData;

    /**
     * Reads the question state out of the template by accessing the DOM. This function must not modify the
     * DOM in any way.
     * 
     * It is considered best practices to keep this function (and the {@link UserDefinedData}) as simple as
     * possible. The work of interpreting the state should be placed in the {@link render} or {@link parse}
     * methods as much as possible, even if that means both methods call the same functions to re-compute
     * data.
     */
    read(): UserDefinedData;

    /**
     * Given the state of the page, creates an array of answer keys, which must be the same length as the list
     * of parts in the QuestionData.
     *
     * The key `null` indicates that the corresponding Part has not been completed and should not be analyzed
     * to provide {@link FeedbackData FeedbackData}.
     */
    parse(userData: UserDefinedData): (string | null)[];
}
