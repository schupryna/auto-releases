/*eslint no-undef: "off"*/
/*eslint no-trailing-spaces: "off"*/
/*eslint no-unused-vars: "off"*/

const core = require("@actions/core");
const io = require("@actions/io");
const tc = require("@actions/tool-cache");
const shelljs = require("shelljs");


async function setupAutoCLI() {
    await io.mkdirP("/usr/local/bin/");

    const downloadPath = await tc.downloadTool(
        "https://github.com/intuit/auto/releases/download/v11.0.0/auto-linux.gz",
        "/usr/local/bin/auto-linux.gz"
    );
    
    core.debug(`File downloaded: ${downloadPath}`);

    await shelljs.exec(`gzip -d ${downloadPath} && mv /usr/local/bin/auto-linux /usr/local/bin/auto && chmod +x /usr/local/bin/auto`);
    await shelljs.exec(`ls -a /usr/local/bin/`);

    core.addPath("/usr/local/bin/auto");
    core.info(`Setup finished for auto, version: ${await shelljs.exec("auto --version").stdout.trim()}`);
}

module.exports = { setupAutoCLI };
