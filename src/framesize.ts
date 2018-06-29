declare var ResizeObserver: undefined | any;

export class FrameSizer {
    private parentIFrame: null | HTMLIFrameElement;
    private knownHeight: number;
    private verbose: boolean;
    private needsChecks: boolean;

    private log(msg: string) {
        if (this.verbose) {
            console.log(`FrameSizer: ${msg}`)
        }
    }

    private error(msg: string) {
        console.error(`FrameSizer: ${msg}`)
    }

    /**
     * 
     * @param opt.verbose If true, print verbose input about resizing to the console.
     * @param opt.spindebug If true, run a continuous process in the background to check that the height is correct. (THIS IS VERY EXPENSIVE.)
     */
    public constructor(opt?: { verbose?: boolean, spindebug?: boolean }) {
        this.verbose = !!opt && !!opt.verbose;
        const parentIFrame = window.frameElement;
        if (parentIFrame === null) {
            this.log("Not inside loop, not doing anything.")
            this.parentIFrame = null;
            this.knownHeight = -1;
            this.needsChecks = false;
        } else if (parentIFrame.tagName !== "IFRAME") {
            this.error(`Inside a container that is not an <iframe>, cannot resize.`);
            this.parentIFrame = null;
            this.knownHeight = -1;
            this.needsChecks = false;
        } else {
            this.parentIFrame = parentIFrame as HTMLIFrameElement;
            this.knownHeight = document.body.offsetHeight;
            this.parentIFrame.height = `${this.knownHeight}px`;

            // Very expensive constant rechecking of height (debugging only, doesn't resize)
            const me = this;           
            function loop(docheight: number, frameheight: number, start: number) {
                const newdocheight = document.body.offsetHeight;
                const newframeheight = parseInt(me.parentIFrame!.height);
                const now = Math.floor(performance.now() - start);
                if (newdocheight !== docheight || newframeheight !== frameheight) {
                    if (newdocheight === newframeheight) {
                        console.log(`FrameSizer +${now}: correct iframe height ${newframeheight} for this document height`);
                    } else {
                        console.log(`FrameSizer +${now}: incorrect iframe height ${newframeheight} for document height ${newdocheight}`)
                    }
                }
                setTimeout(() => loop(newdocheight, newframeheight, start));
            }
            if (opt && opt.spindebug) loop(this.knownHeight, this.knownHeight, performance.now());

            // Some messy extra resets, to handle a remaining bug in Edge
            // I would like to remove this if I can understand that bug
            setTimeout(() => this.doCheck(), 700);
            setTimeout(() => this.doCheck(), 2100);
            setTimeout(() => this.doCheck(), 6300);
            setTimeout(() => this.doCheck(), 18900);

            if (typeof ResizeObserver !== "undefined") {
                this.log("Using ResizeObserver to resize. (Manual resize will be inactive.)");
                this.needsChecks = false;
                new ResizeObserver(() => this.doCheck()).observe(document.body);
            } else if (typeof MutationObserver !== "undefined") {
                this.log("Using MutationObserver to resize.");
                this.needsChecks = true;
                new MutationObserver(() => this.doCheck()).observe(document, {
                    childList: true,
                    attributes: true,
                    subtree: true
                });
            } else {
                this.error(`No MutationObserver, this browser does not support resizing.`);
                this.parentIFrame = null;
                this.needsChecks = false;
            }
        }
    }

    private doCheck() {
        if (this.parentIFrame !== null) {
            const newHeight = document.body.offsetHeight;
            this.log(`Setting iframe height ${this.knownHeight} --> ${newHeight}`);
            this.parentIFrame.height = `${newHeight}px`;
            this.knownHeight = newHeight;
        }
    }

    public check() {
        if (this.needsChecks) {
            this.log("check() called, check will be performed.")
            this.doCheck();
        } else if (this.parentIFrame === null) {
            this.log("check() called, but will be ignored")
        } else {
            this.log("check() called, but will be ignored because there we are using ResizeObserver")
        }
    }
}
