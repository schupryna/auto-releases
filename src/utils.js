/*eslint no-undef: "off"*/
/*eslint no-trailing-spaces: "off"*/
/*eslint no-unused-vars: "off"*/

const fs = require('fs');
  
function generateAutoRc({
    mainBranch,
    releaseBranch,
    slackChannelsInput,
    notifyOnPreRelease,
}){
    return {
        prereleaseBranches: [mainBranch],
        baseBranch: releaseBranch,
        plugins: [
            [
                "slack",
                {
                    auth: "app",
                    channels: slackChannelsInput.split(',').map(i => i.trim()),
                    atTarget: "here",
                    publishPreRelease: notifyOnPreRelease,
                    username: "Pypestream",
                    iconEmoji: ":pypestream-newlogo"
                }
            ],
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
        if(typeof input[key] === "boolean") {
            return;
        }
        if(!inputs[key]) {
            throw new Error(`Validation failed for input ${key} value: ${inputs[key]}`);
        }
        if(!inputs[key].length) {
            throw new Error(`Validation failed for input ${key} value: ${inputs[key]}`);
        }
    });
}

async function writeFile(fileName, content) {
    await fs.writeFile(fileName, JSON.stringify(content));
}

module.exports = { validateInputs, generateAutoRc, writeFile };
