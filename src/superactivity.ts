/**
 * Documents a fragement of the SuperActivity API that we need to interact with in order to write the hammock
 * correctly.
 */
export interface SuperActivity {
    webContentFolder: string;

    /*
    currentAttempt: number;
    fileRecordList: { [identifier: string]: void };

    loadFileRecord(id: string, attempt: number, callback: (response: any) => void): void;
    writeFileRecord(
        id: string,
        mimetype: "text/plain" | "text/xml" | "application/json",
        attempt: number,
        content: any,
        callback: (response: any) => void
    ): void;

    startAttempt(callback: (response: any) => void): void;
    endAttempt(callback: (response: any) => void): void;
    scoreAttempt(id: "boolean" | "currency" | "decimal" | "fraction" | "integer" | "percent" | "string", value: number, callback: (response: any) => void): void;
    isCurrentAttemptCompleted(): boolean;
*/
}

export interface SuperActivityClient {
    init(superActivity: SuperActivity, activityData: Element): void;
}
