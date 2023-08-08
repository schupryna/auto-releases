/*eslint no-undef: "off"*/
/*eslint no-trailing-spaces: "off"*/
/*eslint no-unused-vars: "off"*/

const core = require("@actions/core");
const path = require("path");
const io = require("@actions/io");
const hc = require("@actions/http-client");
const tc = require("@actions/tool-cache");
const fs = require("fs");
const shelljs = require("shelljs");


async function setupAutoCLI() {
    const tempDownloadFolder = 'temp_' + Math.floor(Math.random() * 2000000000);
    const tempDirectory = process.env['RUNNER_TEMP'] || '';
    const tempDir = path.join(tempDirectory, tempDownloadFolder);

    await io.mkdirP(tempDir);

    const downloadUrl = "https://github.com/intuit/auto/releases/download/v11.0.0/auto-linux.gz";
    const downloadPath = await tc.downloadTool(downloadUrl, path.join(tempDir, "auto-linux.gz"));

    await shelljs.exec(`gzip -d ${downloadPath}`).stdout.trim();

    const directories = await fs.readdirSync(tempDir);

    core.info(directories);
    io.mv(
        path.join(tempDir, "auto-linux"),
        path.join(tempDir, "auto"),
    );
    core.addPath(path.join(tempDir, "auto"));
    core.info(`${await shelljs.exec("auto --version").stdout.trim()}`);
    core.info("Setup finished for auto");
}

module.exports = { setupAutoCLI };
