// import * as core from "@actions/core";
// import * as github from "@actions/github";
// import * as semver from "semver";

const core   = require("@actions/core");
const github = require("@actions/github");
// const semver = require("semver");
const shelljs = require("shelljs");

const owner = github.context.payload.repository.owner.login;
const repo = github.context.payload.repository.name;

const Error = {};

async function loadBranch(octokit, branch) {
    const result = await octokit.rest.git.listMatchingRefs({
        owner,
        repo,
        ref: `heads/${branch}`
    });

    // core.info(`branch data: ${ JSON.stringify(result.data, undefined, 2) } `);
    return result.data.shift();
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

    // load inputs
    // const customTag     = core.getInput('custom-tag');
    const dryRun        = core.getInput("dry-run").toLowerCase();
    const mainBranch = core.getInput("main-branch");
    const releaseBranch = core.getInput("release-branch");

    const activeBranch = github.context.ref.replace(/refs\/heads\//, "");
    let branchInfo;


    core.info(`load the history of activity-branch ${ activeBranch } from context ref ${ github.context.ref }`);
    branchInfo  = await loadBranch(octokit, activeBranch);

    if (!branchInfo) {
        throw new Error(`failed to load branch ${ activeBranch }`);
    }

    // the sha for tagging
    const sha        = branchInfo.object.sha;
    const branchName = branchInfo.ref.split("/").pop();
    const currentTagInBranch = await getCurrentTagInBranch();

    core.info(`active branch name is ${ branchName }`);

    if(branchName === mainBranch){
        core.info(`creating tag for pre-release`);
    } else if (branchName === releaseBranch){
        core.info(`creating tag for release`);
    } else {
        throw new Error(`error: this branch ${activeBranch} is not set for release/pre-release`);
    }

    if (dryRun === "true") {
        core.info("dry run, don't perform tagging");
        return;
    }
    core.info(sha);
    core.info(currentTagInBranch);
    // const newTag = `${ withV }${ nextVersion }`;

    // core.info(`really add tag ${ customTag ? customTag : newTag }`);

    // const ref = `refs/tags/${ customTag ? customTag : newTag }`;

    // await octokit.rest.git.createRef({
    //     owner,
    //     repo,
    //     ref,
    //     sha
    // });
}

action()
    .then(() => core.info("success"))
    .catch(error => core.setFailed(error.message));
