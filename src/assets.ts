/**
 * Reads the assets from the activity's XML data file.
 *
 * NB: As written, readAssets assumes that ALL assets are file resources that should be loaded into memory. If
 * we want to have richer behavior, I think the right approach is to modify the activity description DTD to
 * add a new attribute to signal whether the asset is plain text, a filename that should be rewritten with the
 * webContentFolder but not loaded, or a file that should be loaded.
 */
export function readAssets(webContentFolder: string, activityData: Element): Promise<Map<string, any>> {
    const promises: Map<string, Promise<void>> = new Map();
    const assets: Map<string, any> = new Map();

    $(activityData)
        .find("assets asset")
        .each(function(i, asset) {
            console.log(asset);
            const name: string = $(asset).attr("name") || "";
            const value: string = $(asset).text();

            if (name === "") {
                console.error(`Ignoring unnamed asset with value ${value}`);
            } else if (promises.has(name)) {
                console.error(`Multiple assets named ${name}`);
                console.error(`Asset being discarded: ${value}`);
            } else {
                // Right now we're treating ALL assets as files to be loaded into memory. That's probably not
                // actually the right move permanently, but doing better will require
                promises.set(
                    name,
                    new Promise(resolve => {
                        console.log(name);
                        $.get(webContentFolder + value, content => {
                            assets.set(name, content);
                            console.log(name);
                            console.log(content);
                            resolve();
                        });
                    })
                );
            }
        });

    return Promise.all(promises.values()).then(() => assets);
}
