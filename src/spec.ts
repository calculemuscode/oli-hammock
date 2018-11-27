/**
 * The core of the OLI hammock's data model is the QuestionSpec.
 *
 * This interface describes the **flexible input** that OLI hammock reads from a JSON file.
 * The data passed to the activity is the more rigid {@link QuestionData QuestionData} format.
 */
export interface QuestionSpec {
    /**
     * Configuration: an optional prompt, passed directly to the activity.
     */
    readonly prompt?: string;

    /**
     * Configuration: optional hints, passed directly to the activity.
     */
    readonly hints?: string[];

    /**
     * Configuration: arbitrary JSON data, passed directly to the activitiy.
     */
    readonly config?: any;

    /**
     * The grading logic shared between all the parts of this question. If there are question
     * parts with grading logic, the grade key will be looked up in the part's table first,
     * and this grading table will be accessed only if the key is not found in the
     * part's grading table. This data is only accessible to OLI Hammock, it is not passed
     * to the activity.
     */
    readonly match?: { [key: string]: FeedbackSpec };

    /**
     * Max score for the whole question. Defaults to the sum of the score parts the `parts`
     * field exists, and 1 otherwise.
     */
    readonly score?: number;

    /**
     * A multipart question configures the individual parts with an array of {@link PartSpec Parts}.
     * Must be non-empty.
     */
    readonly parts?: PartSpec[];
}

/**
 * A {@link QuestionSpec Question} is made up of parts. In multipart questions, these parts can
 * have their own configuration data.
 *
 * This interface describes the **flexible input** that OLI hammock reads from a JSON file.
 * The data passed to the activity is the more rigid {@link PartData PartData} format.
 */
export interface PartSpec {
    /**
     * Configuration: an optional prompt, passed directly to the activity.
     */
    readonly prompt?: string;

    /**
     * Configuration: optional hints, passed directly to the activity.
     */
    readonly hints?: string[];

    /**
     * The grading logic for this question part. This logic will be applied first,
     * and if the key is not found in this table, the match associated with the question
     * will be used instead.
     */
    readonly match?: { [key: string]: FeedbackSpec };

    /**
     * Max score for this part. Defaults to 1 if omitted.
     */
    readonly score?: number;
}

/**
 * The full specification of piece of feedback is a number (the score) and a string.
 *
 * Boolean values are shorthand: `[false, str]` gives no points, and `[true, str]` gives the max points.
 *
 * Only specifying a string `str` is the same as `[0, s]`.
 *
 * The strings you give will be interpreted as Mustache templates. See the {@link parse} function for details.
 *
 * This interface describes the **flexible input** that OLI hammock reads from a JSON file.
 * The data passed to the activity is the more rigid {@link FeedbackData FeedbackData} format.
 */
export type FeedbackSpec = string | [boolean, string] | [number, string];
