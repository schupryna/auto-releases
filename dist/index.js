/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 712:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

/*eslint no-undef: "off"*/
/*eslint no-trailing-spaces: "off"*/
/*eslint no-unused-vars: "off"*/

const core = __nccwpck_require__(426);
const io = __nccwpck_require__(839);
const tc = __nccwpck_require__(638);
const exec = __nccwpck_require__(728);


async function setupAutoCLI() {
    await io.mkdirP("/usr/local/bin/");

    const downloadPath = await tc.downloadTool(
        "https://github.com/intuit/auto/releases/download/v11.0.0/auto-linux.gz",
        "/usr/local/bin/auto-linux.gz"
    );
    
    core.debug(`File downloaded: ${downloadPath}`);

    await exec(`gzip -d ${downloadPath} && mv /usr/local/bin/auto-linux /usr/local/bin/auto && chmod +x /usr/local/bin/auto`);

    core.addPath("/usr/local/bin/auto");
    core.info(`Setup finished for auto, version: ${await exec("auto --version").stdout.trim()}`);
}

module.exports = { setupAutoCLI };


/***/ }),

/***/ 863:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

/*eslint no-undef: "off"*/

const axios = __nccwpck_require__(318);
const core = __nccwpck_require__(426);
const { formatSlackMessage } = __nccwpck_require__(120);

async function sendReleaseNotesToSlack(githubToken, slackToken, owner, repo, tag, channels) {
    try {
        // 1. Query GitHub API to get release by tag
        core.info(`https://api.github.com/repos/${owner}/${repo}/releases/tags/${tag}`);
        const releaseResponse = await axios.get(`https://api.github.com/repos/${owner}/${repo}/releases/tags/${tag}`, {
            headers: {
                'Authorization': `token ${githubToken}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        core.info(releaseResponse);
        core.info(releaseResponse.data.body);
        const releaseNotes = releaseResponse.data.body;

        // Capitalize the repo name
        const capitalizedRepo = repo.charAt(0).toUpperCase() + repo.slice(1);

        // Include the @here mention
        const titleMessage = `@here - New release from ${capitalizedRepo}!\n`;

        const sendToChannel = async (channel) => {
            let slackPayload;

            try {
                core.info("Sending message the by formatting it");
                slackPayload = {
                    channel: channel,
                    icon_emoji: ':pypestream-newlogo:',
                    username: "Pypestream",
                    ...formatSlackMessage(releaseNotes, owner, repo, tag),
                };

            } catch(e) {
                core.info("Failed to format slack message");
                core.info(e);
                slackPayload = {
                    text: titleMessage + releaseNotes,
                    channel: channel,
                    icon_emoji: ':pypestream-newlogo:',
                    username: "Pypestream"
                };
            }

            const response = await axios.post('https://slack.com/api/chat.postMessage', slackPayload, {
                headers: {
                    'Authorization': `Bearer ${slackToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if(response.status !== 200) {
                core.info(JSON.stringify({
                    data: response.data,
                    status: response.status,
                    statusText: response.statusText,
                }));
            }
        };

        // 3. Send release notes to each Slack channel in parallel
        await Promise.all(channels.map(channel => sendToChannel(channel)));

        core.info('Release notes sent to Slack channels successfully!');

    } catch (error) {
        core.error(error.message);
        throw error;
    }
}

module.exports = sendReleaseNotesToSlack;


/***/ }),

/***/ 120:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

/*eslint no-undef: "off"*/
/*eslint no-trailing-spaces: "off"*/
/*eslint no-unused-vars: "off"*/
/*eslint no-useless-escape: "off"*/

const fs = __nccwpck_require__(147);
  
function generateAutoRc({
    mainBranch,
    releaseBranch
}){
    return {
        prereleaseBranches: [mainBranch],
        baseBranch: releaseBranch,
        plugins: [
            [
                "jira",
                "https://pypestream.atlassian.net/browse"
            ],
            [
                "released",
                {
                    label: ":rocket:"
                }
            ]
        ],
        labels: [
            {
                releaseType: "major",
                name: "major",
            },
            {
                releaseType: "minor",
                name: "minor",
            },
            {
                releaseType: "patch",
                name: "patch",
            },
            {
                name: "docs",
                releaseType: "skip",
            },
            {
                name: "internal",
                releaseType: "skip",
            }
        ]
    };
}

function validateInputs(inputs){    
    Object.keys(inputs).forEach((key) => {
        if(typeof inputs[key] === "boolean") {
            return;
        }
        if(!inputs[key]) {
            throw new Error(`Validation failed for input ${key}}`);
        }
        if(!inputs[key].length) {
            throw new Error(`Validation failed for input ${key}}`);
        }
    });
}

async function writeFile(fileName, content) {
    await fs.writeFileSync(fileName, JSON.stringify(content));
}

const fixLinks = (str) => {
    return str.replace(/\[([^\]]+)\]\(([^\)]+)\):?/g, '<$2|$1>');
};

const getSlackPayload = (messagePayload, owner, repo, tag) => {
    const sectionBlocks = messagePayload.map(({title, listItems}) => {
        return [
            {
                type: "section",
                text: {
                    type: "plain_text",
                    text: title,
                }
            },
            ...listItems.map((listItem) => {
                return {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: listItem
                    },
                };
            }),
        ];
    });
    
    const payload =  {
        "attachments": [
            {
                "blocks": [
                    {
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: `<!here> - *:rocket: New release* has been published for *${owner}/${repo}* <https://github.com/${owner}/${repo}/releases/tag/${tag}|Release ${tag}>`
                        },
                    },
                    {
                        type: "divider"
                    },
                ]
            }
        ]
    };

    sectionBlocks.forEach(i =>{
        i.forEach(k => {
            payload.attachments[0].blocks.push(k);
        });
    });
    return payload;
};

const formatSlackMessage = (content, owner, repo, tag) => {
    const sections = content.split(/\n#+ /);

    // Remove the empty string at the beginning of the array, if it exists
    if (sections[0].trim() === '') {
        sections.shift();
    }
    
    // Create an array to hold the section objects
    let sectionObjects = [];

    sections.forEach((section) => {
        const firstNewLine = section.indexOf('\n');
        let title = firstNewLine === -1 ? section : section.substring(0, firstNewLine).trim();
        let body = firstNewLine === -1 ? '' : section.substring(firstNewLine).trim();
        
        // Remove any remaining '#' from the title
        title = title.replace(/#/g, '').trim();
        
        // Convert list items starting with "- " to an array
        const listItems = body.split('\n')
                                .filter(line => line.startsWith('- '))
                                .map(line => line.substring(2))
                                .map(fixLinks);
        
        // Push each section object to the array
        sectionObjects.push({ title, listItems });
    });

    return getSlackPayload(sectionObjects, owner, repo, tag);
};

module.exports = { validateInputs, generateAutoRc, writeFile, formatSlackMessage };


/***/ }),

/***/ 426:
/***/ ((module) => {

module.exports = eval("require")("@actions/core");


/***/ }),

/***/ 922:
/***/ ((module) => {

module.exports = eval("require")("@actions/github");


/***/ }),

/***/ 839:
/***/ ((module) => {

module.exports = eval("require")("@actions/io");


/***/ }),

/***/ 638:
/***/ ((module) => {

module.exports = eval("require")("@actions/tool-cache");


/***/ }),

/***/ 318:
/***/ ((module) => {

module.exports = eval("require")("axios");


/***/ }),

/***/ 144:
/***/ ((module) => {

module.exports = eval("require")("semver");


/***/ }),

/***/ 728:
/***/ ((module) => {

module.exports = eval("require")("shelljs.exec");


/***/ }),

/***/ 147:
/***/ ((module) => {

"use strict";
module.exports = require("fs");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
/*eslint no-undef: "off"*/
/*eslint no-trailing-spaces: "off"*/
/*eslint no-unused-vars: "off"*/

const core = __nccwpck_require__(426);
const github = __nccwpck_require__(922);
const semver = __nccwpck_require__(144);
const exec = __nccwpck_require__(728);
const setupAuto = __nccwpck_require__(712);
const utils = __nccwpck_require__(120);
const sendSlackNotifications = __nccwpck_require__(863);

const owner = github.context.payload.repository.owner.login;
const repo = github.context.payload.repository.name;

async function loadBranch(octokit, branch) {
  const result = await octokit.rest.git.listMatchingRefs({
    owner,
    repo,
    ref: `heads/${branch}`,
  });

  // core.info(`branch data: ${ JSON.stringify(result.data, undefined, 2) } `);
  return result.data.shift();
}

async function setupProj({ autorc }) {
  core.info("Installing dependencies...");
  await setupAuto.setupAutoCLI();
  await utils.writeFile(".autorc", autorc);
}

async function getCurrentTagInBranch() {
  const output = await exec("git describe --tags --abbrev=0", {
    silent: true,
  });

  const tag = output.stdout.trim();

  core.info(`current tag is ${tag}`);

  return tag;
}

async function action() {
  core.info(`run for ${owner} / ${repo}`);

  // core.info(`payload ${JSON.stringify(github.context.payload.repository, undefined, 2)}`);

  // prepare octokit
  const token = core.getInput("github-token", { required: true });
  const octokit = new github.getOctokit(token);

  // load inputs
  const dryRun = core.getInput("dry-run").toLowerCase();
  const mainBranch = core.getInput("main-branch");
  const releaseBranch = core.getInput("release-branch");
  const slackToken = core.getInput("slack-token");
  const slackChannelsInput = core.getInput("slack-channels");
  const notifyOnPreRelease =
    core.getInput("notify-on-pre-release") === "true" ? true : false;

  // validate inputs
  utils.validateInputs({
    mainBranch,
    releaseBranch,
    slackToken,
    slackChannelsInput,
    notifyOnPreRelease,
    repository: repo.toUpperCase(),
  });

  // Setting up env for auto cli
  process.env["GH_TOKEN"] = token;
  process.env["SLACK_TOKEN"] = slackToken;

  // setup project
  await setupProj({
    autorc: utils.generateAutoRc({
      mainBranch,
      releaseBranch,
    }),
  });

  const activeBranch = github.context.ref.replace(/refs\/heads\//, "");
  let branchInfo,
    releaseType,
    shouldSendSlackNotification = notifyOnPreRelease;

  core.info(
    `load the history of activity-branch ${activeBranch} from context ref ${github.context.ref}`
  );
  branchInfo = await loadBranch(octokit, activeBranch);

  if (!branchInfo) {
    throw new Error(`failed to load branch ${activeBranch}`);
  }

  // the sha for tagging
  const branchName = branchInfo.ref.split("/").pop();
  const currentTagInBranch = await getCurrentTagInBranch();

  core.info(`active branch name is ${branchName}`);

  if (![mainBranch, releaseBranch].includes(branchName)) {
    throw new Error(
      `error: this branch ${activeBranch} is not set for release/pre-release`
    );
  }

  releaseType = branchName === mainBranch ? "pre-release" : "full-release";

  const tags = await octokit
    .request("GET /repos/{owner}/{repo}/git/refs/tags", {
      owner: owner,
      repo: repo,
    })
    // toss out metadata other than the name of the git tags themselves
    .then((d) => {
      return d.data.map((item) => {
        return item.ref.replace("refs/tags/", "");
      });
    });

  core.info(`git tags from github ${tags}`);

  // get the latest git tag version, INCLUDING pre-releases
  const latestTagWithPreReleases = semver.maxSatisfying(tags, "*", {
    includePrerelease: true,
  });

  // get the latest git tag version, EXCLUDING pre-releases
  const latestTagWithoutPreReleases = semver.maxSatisfying(tags, "*", {
    includePrerelease: false,
  });

  core.info(`current git tag in branch ${currentTagInBranch}`);
  core.info(
    `latest git tag (including pre-releases): ${latestTagWithPreReleases}`
  );
  core.info(
    `latest git tag (excluding pre-releases): ${latestTagWithoutPreReleases}`
  );

  // calculate the SEMVER bump (major, minor, patch, premajor, preminor, prepatch)
  // calculation uses the labels on PRs merged into current branch since the last release was cut
  const nextVersionCommand = await exec(
    `auto version --from ${
      releaseType === "full-release"
        ? latestTagWithoutPreReleases
        : latestTagWithPreReleases
    }`,
    {
      silent: true,
    }
  );

  if (!nextVersionCommand.ok) {
    core.info("Error");
    core.error(nextVersionCommand.stderr);
    throw new Error(nextVersionCommand.stderr);
  }

  let semverVersionBump = nextVersionCommand.stdout.trim();

  core.info(`original SEMVER bump calculated: ${semverVersionBump}`);

  // manually strip out the 'pre' prefix (preminor, prepatch, premajor) if running a full release
  if (releaseType === "full-release") {
    semverVersionBump = semverVersionBump.replace("pre", "");
    shouldSendSlackNotification = true;
  }

  core.info(
    `adjusted semverVersionBump after factoring in the type of release: ${semverVersionBump}`
  );

  const nextVersion = await semver.inc(
    latestTagWithPreReleases,
    releaseType === "pre-release" &&
      semver.prerelease(latestTagWithPreReleases) !== null
      ? "prerelease"
      : semverVersionBump,
    releaseType === "pre-release" ? "rc" : undefined
  );

  // ^ calculate the next version, factoring in the current version, SEMVER bump, and release type
  core.info(`computed next version ${nextVersion} ${releaseType}`);

  if (!semver.valid(nextVersion) || nextVersion === null) {
    throw Error(
      `The calculated next version of the code, ${nextVersion}, is not valid. Existing early.`
    );
  }

  // exit early if the version about to be released already exists
  if (tags.length && tags.includes(`v${nextVersion}`)) {
    throw Error(
      `The next version we want to release, v${nextVersion}, appears to already exist on Github!`
    );
  }

  core.info("---");

  // is the version we're about to release OLDER than the latest release?
  if (
    tags.length &&
    latestTagWithoutPreReleases !== null &&
    !semver.gt(nextVersion, latestTagWithoutPreReleases.replace("v", ""))
  ) {
    throw Error(
      `The next version slated to be released, v${nextVersion} is older than the latest stable release, ${latestTagWithoutPreReleases}`
    );
  }

  if (dryRun === "true") {
    core.info("dry run, don't perform tagging");
    return;
  }
  const autoRelease = await exec(
    `npx auto release --from ${latestTagWithoutPreReleases} --use-version v${nextVersion}`
  );

  if (autoRelease.ok) {
    core.info(autoRelease.stdout.trim());
    core.setOutput("new-tag", `v${nextVersion}`);
    core.setOutput("latestTagWithPreReleases", latestTagWithPreReleases);
    core.setOutput("latestTagWithoutPreReleases", latestTagWithoutPreReleases);
    core.setOutput("releaseType", releaseType);
    if (shouldSendSlackNotification) {
      await sendSlackNotifications(
        token,
        slackToken,
        owner,
        repo,
        `v${nextVersion}`,
        slackChannelsInput.split(",").map((c) => c.trim())
      );
    }
  } else {
    throw new Error(autoRelease.stderr);
  }
}

action()
  .then(() => core.info("success"))
  .catch((error) => core.setFailed(error.message));

})();

module.exports = __webpack_exports__;
/******/ })()
;