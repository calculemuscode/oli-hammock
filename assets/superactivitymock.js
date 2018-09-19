function SuperActivityMock() {
    this.webContentFolder = "./assets/";
    this.currentAttempt = 1;
    this.writeFileRecord = (x,y,z,w,callback) => callback();
    this.scoreAttempt = (x,y,callback) => callback();
    this.endAttempt = callback => callback();
    this.startAttempt = callback => callback($("<div/>"));
    this.sessionData = $("<div/>");
    this.loadFileRecord = (x,y,callback) => { throw new Error("Don't know how to do this"); };
    this.logAction = (action, callback) => { console.info(`logged action: ${JSON.stringify(action)}`); setTimeout(() => callback()); };
}
