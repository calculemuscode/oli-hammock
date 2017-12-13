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
    response: UserDefinedData;

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
 * The state of the question is stored in a seralizable object. The implementer of the Activity and the
 * Activity's internal code know what this UserDefinedData is, but the OLI Hammock code treats it as an
 * abstract type.
 *
 * The hammock will serializing and deserializing UserDefinedData (despite it being an abstract type, because
 * this is JavaScript and LOL literally nothing matters). Serializing and deserializing UserDefinedData as
 * JSON must leave it the same.
 */
export interface Activity<UserDefinedData> {
    /**
     * Renders the question state into the template.
     */
    render(data: QuestionData<UserDefinedData>): void;

    /**
     * Optionally give a UserDefinedData to be passed in for a new (or freshly-reset) Question. If this is not
     * given, then the UserDefinedData for the initial call to `render` will be `null`.
     *
     * This function is called on freshly-initalized questions and is re-invoked whenever the function is
     * reset, so it can be used to generate randomized questions.
     */
    init(): UserDefinedData;

    /**
     * Reads the question state out of the template.
     */
    read(): UserDefinedData;

    /**
     * Given the state of the page, creates an array of answer keys, which must be the same length as the list
     * of parts in the QuestionData.
     *
     * The key `null` indicates that.
     */
    parse(userData: UserDefinedData): (string | null)[];
}
