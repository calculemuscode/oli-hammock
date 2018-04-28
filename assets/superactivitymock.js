function SuperActivityMock() {
    this.ended = false;
    this.webContentFolder = "./assets/";
    this.currentAttempt = 1;
    this.writeFileRecord = (x,y,z,w,callback) => callback();
    this.scoreAttempt = (x,y,callback) => callback();
    this.endAttempt = callback => { this.ended = true; callback(); }
    this.startAttempt = callback => { this.ended = false; this.currentAttempt += 1; callback($("<div/>")); }
    this.sessionData = $("<div/>");
    this.loadFileRecord = (x,y,callback) => { throw new Error("Don't know how to do this"); };
    this.isCurrentAttemptCompleted = () => this.ended;
}
