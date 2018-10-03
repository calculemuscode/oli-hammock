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

function ActionLog() { };
ActionLog.prototype.addSupplement = function(x) { this.supplement = x; }

function SupplementLog() { };
SupplementLog.prototype.setAction = function(x) { this.action = x; }
SupplementLog.prototype.setSource = function(x) { this.source = x; }
SupplementLog.prototype.setInfoType = function(x) { this.infoType = x; }
SupplementLog.prototype.setInfo = function(x) { this.info = x; }