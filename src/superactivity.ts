/**
 * Documents a fragement of the SuperActivity API that we need to interact with in order to write the hammock
 * correctly.
 */
export interface SuperActivity {
    readonly webContentFolder: string;
    currentAttempt: string | number;

    writeFileRecord(
        recordname: string,
        mimetype: "application/json",
        attempt: string | number,
        content: string,
        callback: () => void
    ): void;
    scoreAttempt(typ: "percent", score: number, callback: () => void): void;
    endAttempt(callback: () => void): void;
    startAttempt(callback: (response: Element) => void): void;
    sessionData: Element;
    loadFileRecord(recordname: string, attempt: string | number, callback: (content: any) => void): void;
}

export interface SuperActivityClient {
    init(superActivity: SuperActivity, activityData: Element): void;
}
