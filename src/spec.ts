// Note RJS April 27, 2018:
// Need to deprecate QuestionSpec[] as a possibility: Hammock isn't going to be able to support this.
export type QuestionsSpec = QuestionSpec | QuestionSpec[];

/**
 * The core of the OLI hammock's data model is the QuestionSpec.
 */
export interface QuestionSpec {
    /**
     * Prompts can optionally be associated with a question.
     */
    prompt?: string;

    /**
     * A question is made up of either one {@link PartSpec Part} or several {@link PartSpec Parts}. _Exactly
     * one_ of `parts` and `part` fields _must_ be present.
     */
    part?: PartSpec;

    /**
     * A question is made up of either one {@link PartSpec Part} or several {@link PartSpec Parts}. _Exactly
     * one_ of `parts` and `part` fields _must_ be present.
     */
    parts?: PartSpec[];

    /**
     * Hints may be associated with a complete question.
     */
    hints?: string[];
}

/**
 * A {@link QuestionSpec Question} is made up of parts
 */
export interface PartSpec {
    /**
     * Prompts can optionally be associated with a single part of a {@link QuestionSpec Question}.
     */
    prompt?: string;

    /**
     * Part score. Defaults to 1 if omitted.
     */
    score?: number;

    /**
     * The grading logic for the question is a map from keys to feedback.
     */
    match: { [key: string]: FeedbackSpec };

    /**
     * If the match logic is potentially incomplete, there *must* be a fallthrough `nomatch` case.
     */
    nomatch?: FeedbackSpec;

    /**
     * Hints may be associated with a part.
     */
    hints?: string[];
}

/**
 * The full specification of piece of feedback is a number (the score) and a string.
 *
 * Boolean values are shorthand: `[false, str]` gives no points, and `[true, str]` gives full points.
 *
 * Only specifying a string `str` is the same as `[0, s]`
 */
export type FeedbackSpec = string | [boolean, string] | [number, string];
