/*eslint no-undef: "off"*/
/*eslint no-trailing-spaces: "off"*/
/*eslint no-unused-vars: "off"*/

const fs = require('fs');
  
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

module.exports = { validateInputs, generateAutoRc, writeFile };
