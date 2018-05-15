/**
 * Resizes the surronding iframe of an OLI activity. Exported here so that it can be used by OLI widgets.
 * If you think need to call this as a client, _you are doing something wrong_. Stop.
 */
export function resizeOLIFrame() {
    // Then resize frame based on the offsetHeight of the content
    // https://stackoverflow.com/questions/22675126/what-is-offsetheight-clientheight-scrollheight
    const targetWindow = window.frameElement ? window.frameElement.getAttribute("data-activityguid") : null;
    if (targetWindow !== null) {
        // Looks like we're running inside the OLI environment, where resizing is needed
        const selection = Array.from(window.parent.document.getElementsByTagName("iframe"));
        console.log(targetWindow);
        selection.forEach(iframe => {
            console.log(iframe);
            console.log(iframe.getAttribute("data-activityguid"));
            if (iframe.getAttribute("data-activityguid") === targetWindow) {
                iframe.height = `${document.body.offsetHeight}px`;
            }
        });
    }
}
