# `auto-releases` GitHub Action

**Author**: pypestream

Automate your releases with the `auto-releases` GitHub Action. Seamlessly generate releases/pre-releases with semantic versioning and notify your Slack channels in real-time.

## Features:
1. **Semantic Versioning**: Determine versions automatically from commit messages.
2. **Releases/Pre-releases**: Decide the type of release based on branches such as 'next' and 'latest'.
3. **Slack Notifications**: Send out updates about the release notes to specified Slack channels.
4. **Customizable**: Set your preferences with an array of customizable inputs.

## 🚀 Example Usage

```yaml
name: Release Workflow
on:
  push:
    branches:
      - next
      - release

jobs:
  auto_release:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v2
        
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: 16

      - name: Use auto-releases
        uses: pypestream/auto-releases@next
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          slack-token: ${{ secrets.SLACK_TOKEN }}
          slack-channels: 'general, releases'
          notify-on-pre-release: true
          dry-run: false
          release-branch: 'release'
          main-branch: 'next'
```

## 🔧 Inputs

- **github-token**: Token for GitHub. Default is the provided GitHub token.
- **slack-token**: Required. Token to send release notes to Slack.
- **slack-channels**: Required. Slack channels for release notes. Multiple channels can be separated by commas.
- **notify-on-pre-release**: Notify on pre-releases? Default is `true`.
- **dry-run**: Check the action without actual execution. Default is `FALSE`.
- **release-branch**: Release branch name. Default is `release`.
- **main-branch**: Main branch name. Default is `next`.

## 📤 Outputs

- **new-tag**: The new tag created.
- **tag**: The most recent tag.
