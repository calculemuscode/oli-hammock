module.exports.simple = function (activity) {
    return {
        init: function (superActivity, activityData) {
            const webContentFolder = (superActivity && superActivity.webContentFolder) || "./assets/";

            const title = $(activityData).find("title").text();
            const assets = new Map();
            const promises = new Set();

            $(activityData).find("assets asset").each(function(i, asset) {
                const name = $(asset).attr("name");
                const value = $(asset).text();

                // Convert the assets into a map
                if (assets.has(name)) {
                    console.error("Multiple assets named " + name);
                    console.error("Asset being discarded: " + value);
                } else {
                    const i = value.lastIndexOf(".");
                    const c = i == -1 ? "" : value.substring(i);
                    assets.set(name, value);

                    // Replace some assets with complete paths or with the actual content
                    switch (c) {
                        case ".json":
                        promises.add(new Promise((resolve, reject) => {
                            $.get(webContentFolder + value, content => {
                                assets.set(name, content);
                                resolve();
                            })
                        }));
                        break;

                        case ".html":
                        promises.add(new Promise((resolve, reject) => {
                            $.get(webContentFolder + value, content => {
                                assets.set(name, content);
                                resolve();
                            })
                        }));

                        case ".css":
                        assets.set(name, Promise.resolve(webContentFolder + value));
                        break;
                    }
                }
            });

            Promise.all(promises).then(() => {
                if (assets.has("layout")) {
                    $("#oli-embed").append(assets.get("layout"));
                }

                let questions = assets.get("questions");
                if (typeof activity == "function") {
                    activity = activity(assets);
                }

                activity = activity ? activity : {};
                if (!activity.then) {
                    activity.render && activity.render(questions);
                } else {
                    activity.then(() => activity.render && activity.render(questions));
                }
            });
        }
    };
};
