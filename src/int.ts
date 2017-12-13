/**
 * Internal (canonicalized) version of QuestionSpec
 */
export type QuestionsInt = QuestionInt[];

export interface QuestionInt {
    prompt?: string;
    parts: PartInt[];
    hints?: string[];
}

export interface PartInt {
    prompt?: string;
    score: number;
    match: Map<string, FeedbackInt>;
    nomatch?: FeedbackInt;
    hints?: string[];
}

export interface FeedbackInt {
    score: number;
    message: string;
}

/**
 * Checks that the input questions object is in the correct format as specified by {@link QuestionsSpec}, and
 * canonicalizes it into the more rigorous {@link QuestionsInt} format used internally.
 */
export function validateQuestions(questions: any): QuestionsInt {
    return Array.isArray(questions) ? questions.map(validateQuestion) : [validateQuestion(questions)];
}

function validateQuestion(question: any): QuestionInt {
    if (typeof question !== "object") {
        throw new Error("validateQuestion: question not an object");
    }
    if (question.hasOwnProperty("prompt") && "string" !== typeof question.prompt) {
        throw new Error("validateQuestion: prompt not a string");
    }
    if (question.hasOwnProperty("parts") && question.hasOwnProperty("part")) {
        throw new Error("validateQuestion has both part and parts fields");
    }
    if (!question.hasOwnProperty("parts") && !question.hasOwnProperty("part")) {
        throw new Error("validateQuestion has neither part nor parts fields");
    }
    if (question.hasOwnProperty("hints") && !Array.isArray(question.hints)) {
        throw new Error("validateQuestion: hints not an array");
    }

    const result: QuestionInt = {
        parts: question.parts ? question.parts.map(validatePart) : [validatePart(question.part)]
    };

    if (question.prompt) result.prompt = question.prompt;
    if (question.hints) {
        result.hints = question.hints.map((hint: any): string => {
            if ("string" !== typeof hint) {
                throw new Error("validateQuestion: hint not a string");
            } else {
                return hint;
            }
        });
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
    if (part.hasOwnProperty("score") && "number" !== typeof part.score) {
        throw new Error("validatePart: score present and not a number");
    }
    if (part.hasOwnProperty("score") && part.score <= 0) {
        throw new Error("validatePart: score must be strictly positive");
    }
    if (part.hasOwnProperty("hints") && !Array.isArray(part.hints)) {
        throw new Error("validatePart: hints not an array");
    }
    const score: number = part.score;
    const match: Map<string, FeedbackInt> = new Map();
    for (let key of Object.keys(part.match)) {
        match.set(key, validateFeedback(part.match[key], score));
    }

    const result: PartInt = {
        score: score,
        match: match
    };

    if (part.prompt) result.prompt = part.prompt;
    if (part.nomatch) result.nomatch = validateFeedback(part.nomatch, score);
    if (part.hints) {
        result.hints = part.hints.map((hint: any): string => {
            if ("string" !== typeof hint) {
                throw new Error("validatePart: hint not a string");
            } else {
                return hint;
            }
        });
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
