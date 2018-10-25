/**
 * Internal (canonicalized) version of QuestionSpec
 */
export interface QuestionInt {
    readonly prompt?: string;
    readonly hints?: string[];
    readonly config?: any;
    readonly score: number;
    readonly parts: PartInt[];
    readonly match: Map<string, FeedbackInt>;
}

export interface PartInt {
    readonly prompt?: string;
    readonly hints?: string[];
    readonly config?: any;
    readonly score: number;
    readonly match: Map<string, FeedbackInt>;
}

export interface FeedbackInt {
    readonly score: number;
    readonly message: string;
}

/**
 * Checks that the input questions object is in the correct format as specified by {@link QuestionSpec}, and
 * canonicalizes it into the more rigorous {@link QuestionInt} format used internally.
 */
export function validateQuestion(question: any): QuestionInt {
    if (typeof question !== "object") {
        throw new Error("validateQuestion: question field not an object");
    }
    if (question.hasOwnProperty("prompt") && "string" !== typeof question.prompt) {
        throw new Error("validateQuestion: prompt field not a string");
    }
    if (question.hasOwnProperty("hints") && !Array.isArray(question.hints)) {
        throw new Error("validateQuestion: hints field not an array");
    }
    if (question.hasOwnProperty("parts") && (!Array.isArray(question.parts) || question.parts.length === 0)) {
        throw new Error("validateQuestion: parts field must be a non-empty array.");
    }
    if (
        question.hasOwnProperty("score") &&
        (typeof question.score !== "number" || (question.score | 0) !== question.score || question.score <= 0)
    ) {
        throw new Error("validateQuestion: score field not a positive integer");
    }
    if (question.hasOwnProperty("part")) {
        throw new Error(
            "validateQuestion: the part field has been removed from OLI Hammock. Use question-wide properties or a parts array."
        );
    }

    // Questions without parts get one default part
    let parts: PartInt[];
    if (question.parts) {
        parts = question.parts.map(validatePart);
    } else {
        parts = [
            {
                score: question.score ? (question.score as number) : 1,
                match: new Map()
            }
        ];
    }

    // Questions without scores get the sum of the part scores
    let score: number;
    if (question.score) {
        score = question.score as number;
    } else {
        score = 0;
        for (let part of parts) {
            score += part.score;
        }
    }

    const match: Map<string, FeedbackInt> = new Map();
    if (question.match) {
        for (let key of Object.keys(question.match)) {
            match.set(key, validateFeedback(question.match[key], score));
        }
    }

    const result: {
        prompt?: string;
        hints?: string[];
        config?: any;
        score: number;
        parts: PartInt[];
        match: Map<string, FeedbackInt>;
    } = {
        score: score,
        parts: parts,
        match: match
    };

    if (question.prompt) result.prompt = question.prompt;
    if (question.config) result.config = question.config;
    if (question.hints) {
        result.hints = question.hints.map(
            (hint: any): string => {
                if ("string" !== typeof hint) {
                    throw new Error("validateQuestion: hint not a string");
                } else {
                    return hint;
                }
            }
        );
    }

    return result;
}

function validatePart(part: any): PartInt {
    if (typeof part !== "object") {
        throw new Error("validatePart: part not an object");
    }
    if (part.hasOwnProperty("prompt") && "string" !== typeof part.prompt) {
        throw new Error("validatePart: prompt not a string");
    }
    if (part.hasOwnProperty("hints") && !Array.isArray(part.hints)) {
        throw new Error("validatePart: hints not an array");
    }
    if (
        part.hasOwnProperty("score") &&
        (typeof part.score !== "number" || (part.score | 0) !== part.score || part.score <= 0)
    ) {
        throw new Error("validatePart: score field not a positive integer");
    }
    const score: number = part.score ? part.score : 1;

    const match: Map<string, FeedbackInt> = new Map();
    if (part.match) {
        for (let key of Object.keys(part.match)) {
            match.set(key, validateFeedback(part.match[key], score));
        }
    }

    const result: {
        prompt?: string;
        hints?: string[];
        config?: any;
        score: number;
        match: Map<string, FeedbackInt>;
    } = {
        score: score,
        match: match
    };

    if (part.prompt) result.prompt = part.prompt;
    if (part.config) result.config = part.config;
    if (part.hints) {
        result.hints = part.hints.map(
            (hint: any): string => {
                if ("string" !== typeof hint) {
                    throw new Error("validatePart: hint not a string");
                } else {
                    return hint;
                }
            }
        );
    }

    return result;
}

function validateFeedback(match: any, partScore: number): FeedbackInt {
    if (typeof match === "string") {
        return { score: 0, message: match };
    }
    if (!Array.isArray(match) || match.length !== 2) {
        throw new Error("validateMatch: match is neither a string or length-2 array " + match);
    }

    const scoring: any = match[0];
    const feedback: any = match[1];

    if (typeof feedback !== "string") {
        throw new Error("validateMatch: match[1] is not a string");
    }
    if (typeof scoring === "boolean") {
        return { score: scoring ? partScore : 0, message: feedback };
    }
    if (typeof scoring !== "number") {
        throw new Error("validateMatch: match[0] is not a number or boolean");
    }
    if (scoring < 0) {
        throw new Error("validateMatch: score is negative");
    }
    if (scoring > partScore) {
        throw new Error(`validateMatch: score ${scoring} is greater than part score of ${partScore}`);
    }

    // Validate more?
    return { score: scoring, message: feedback };
}
