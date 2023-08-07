/*eslint no-undef: "off"*/
/*eslint no-trailing-spaces: "off"*/

const core   = require("@actions/core");
const github = require("@actions/github");
const semver = require("semver");
const shelljs = require("shelljs");

const owner = github.context.payload.repository.owner.login;
const repo = github.context.payload.repository.name;

function Error(){}

async function loadBranch(octokit, branch) {
    const result = await octokit.rest.git.listMatchingRefs({
        owner,
        repo,
        ref: `heads/${branch}`
    });

    // core.info(`branch data: ${ JSON.stringify(result.data, undefined, 2) } `);
    return result.data.shift();
}

async function fetchAll() {
    core.info("Fetching all branches");

    const output = await shelljs.exec("git fetch --all --force", {
        silent: true,
    });

    if(output.ok){
        core.info(output.stdout.trim());
    }else {
        core.error(output.stderr.trim());
    }
}

async function getCurrentTagInBranch() {
    const output =  await shelljs.exec("git describe --tags --abbrev=0", {
       silent: true,
     });

     return output.stdout.trim();
}

async function action() {
    core.info(`run for ${ owner } / ${ repo }`);

    // core.info(`payload ${JSON.stringify(github.context.payload.repository, undefined, 2)}`);

    // prepare octokit
    const token = core.getInput("github-token", {required: true});
    const octokit = new github.getOctokit(token);

    // fetch all
    await fetchAll();

    // load inputs
    const dryRun        = core.getInput("dry-run").toLowerCase();
    const mainBranch = core.getInput("main-branch");
    const releaseBranch = core.getInput("release-branch");

    const activeBranch = github.context.ref.replace(/refs\/heads\//, "");
    let branchInfo, releaseType;


    core.info(`load the history of activity-branch ${ activeBranch } from context ref ${ github.context.ref }`);
    branchInfo  = await loadBranch(octokit, activeBranch);

    if (!branchInfo) {
        throw new Error(`failed to load branch ${ activeBranch }`);
    }

    // the sha for tagging
    const branchName = branchInfo.ref.split("/").pop();
    const currentTagInBranch = await getCurrentTagInBranch();

    core.info(`active branch name is ${ branchName }`);

    if(![mainBranch, releaseBranch].includes(branchName)){
        throw new Error(`error: this branch ${activeBranch} is not set for release/pre-release`);
    }

    releaseType = branchName === mainBranch ? "pre-release" : "full-release";

    const tags = await octokit.rest.repos
    .listTags({
      owner,
      repo,
    })
    // toss out metadata other than the name of the git tags themselves
    .then((d) => {
      return d.data.map((item) => {
        return item.name;
      });
    });

    core.info('git tags from github', tags);

    // get the latest git tag version, INCLUDING pre-releases
    const latestTagWithPreReleases = semver.maxSatisfying(tags, '*', {
        includePrerelease: true,
    });

    // get the latest git tag version, EXCLUDING pre-releases
    const latestTagWithoutPreReleases = semver.maxSatisfying(tags, '*', {
        includePrerelease: false,
    });

    core.info(`current git tag in branch ${currentTagInBranch}`);
    core.info(`latest git tag (including pre-releases): ${latestTagWithPreReleases}`);
    core.info(`latest git tag (excluding pre-releases): ${latestTagWithoutPreReleases}`);

    // calculate the SEMVER bump (major, minor, patch, premajor, preminor, prepatch)
    // calculation uses the labels on PRs merged into current branch since the last release was cut
    let semverVersionBump = await shelljs
    .exec(
        `./node_modules/.bin/auto version --from ${
            releaseType === 'full-release'
            ? latestTagWithoutPreReleases
            : latestTagWithPreReleases
        }`,
        {
            silent: true,
        }
    )
    .stdout.trim();

    core.info('original SEMVER bump calculated: ', semverVersionBump);

    // manually strip out the 'pre' prefix (preminor, prepatch, premajor) if running a full release
    if (releaseType === 'full-release') {
        semverVersionBump = semverVersionBump.replace('pre', '');
    }

    core.info(`adjusted semverVersionBump after factoring in the type of release: ${semverVersionBump}`);

    const nextVersion = await semver.inc(
        latestTagWithPreReleases,
        releaseType === 'pre-release' && semver.prerelease(latestTagWithPreReleases) !== null
            ? 'prerelease'
            : semverVersionBump,
        releaseType === 'pre-release' ? 'rc' : undefined
    );

    // ^ calculate the next version, factoring in the current version, SEMVER bump, and release type
    core.info('computed next version', nextVersion, releaseType);

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

    console.log('---');

    // is the version we're about to release OLDER than the latest release?
    if (
        tags.length &&
        latestTagWithoutPreReleases !== null &&
        !semver.gt(nextVersion, latestTagWithoutPreReleases.replace('v', ''))
    ) {
        throw Error(
        `The next version slated to be released, v${nextVersion} is older than the latest stable release, ${latestTagWithoutPreReleases}`
        );
    }

    if (dryRun === "true") {
        core.info("dry run, don't perform tagging");
        return;
    }
    const autoRelease = await shelljs.exec(
        `npx auto release --from ${latestTagWithoutPreReleases} --use-version v${nextVersion}`
    );

    if(autoRelease.ok) {
        core.info(autoRelease.stdout.trim());
    }else {
        throw new Error(autoRelease.stderr);
    }
    
}

action()
    .then(() => core.info("success"))
    .catch(error => core.setFailed(error.message));
