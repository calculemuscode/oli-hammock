/**
 * Documents a fragement of the SuperActivity API that we need to interact with in order to write the hammock
 * correctly.
 */
export interface SupplementLog {
    action: string,
    source: string,
    infoType: string,
    info: "true" | "false"
}

export interface ActionLog {
    action: string,
    sessionId: string,
    info: string,
    externalObjectId: string,
    source: string,
    timeZone: string,
    supplements: SupplementLog[];
}

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
    logAction(action: ActionLog, callback: () => void): void;
    sessionId: string;
    resourceId: string;
    activityGuid: string;
    timeZone: string;
}

export interface SuperActivityClient {
    init(superActivity: SuperActivity, activityData: Element): void;
}
