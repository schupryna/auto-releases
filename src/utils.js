/*eslint no-undef: "off"*/
/*eslint no-trailing-spaces: "off"*/
/*eslint no-unused-vars: "off"*/
/*eslint no-useless-escape: "off"*/

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
