declare var ResizeObserver: undefined | any;

export class FrameSizer {
    private parentIFrame: null | HTMLIFrameElement;
    private knownHeight: number;
    private needsChecks: boolean;

    /**
     * Our document needs to be linked to the parent iframe by a link
     *
     * @param attribute The parent iframe should have this attribute defined
     * @param value The parent iframe's attribute should have this value
     */
    public constructor() {
        const parentIFrame = window.frameElement;
        if (parentIFrame === null) {
            // Do nothing if we're not inside an iframe
            this.parentIFrame = null;
            this.knownHeight = -1;
            this.needsChecks = false;
        } else if (parentIFrame.tagName !== "IFRAME") {
            // Give up if we're inside something that is not an iframe
            console.error(`FrameSizer: not inside an <iframe>, cannot resize.`);
            this.parentIFrame = null;
            this.knownHeight = -1;
            this.needsChecks = false;
        } else {
            this.parentIFrame = parentIFrame as HTMLIFrameElement;
            this.knownHeight = document.body.offsetHeight;
            this.parentIFrame.height = `${this.knownHeight}px`;

            if (typeof ResizeObserver !== "undefined") {
                // If there's a ResizeObserver (Chrome only as of 2018), then the manual checks aren't needed
                this.needsChecks = false;
                new ResizeObserver(() => this.doCheck()).observe(document.body);
            } else if (typeof MutationObserver !== "undefined") {
                // MutationObserver should be present in all modern browsers (IE11, Edge, Safari 6, Chrome, Firefox)
                this.needsChecks = true;
                new MutationObserver(() => this.doCheck()).observe(document.body, {
                    childList: true,
                    attributes: true,
                    subtree: true
                });
            } else {
                console.error(`FrameSizer: no MutationObserver, this browser does not support resizing.`);
                this.needsChecks = false;
            }
        }
    }

    private doCheck() {
        if (this.parentIFrame !== null) {
            const newHeight = document.body.offsetHeight;
            if (newHeight !== this.knownHeight) {
                this.parentIFrame.height = `${newHeight}px`;
                this.knownHeight = newHeight;
            }
        }
    }

    public check() {
        if (this.needsChecks) this.doCheck();
    }
}
