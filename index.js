const DiffMatchPatch = require('diff-match-patch');
const core = require('@actions/core');
const github = require('@actions/github');
let octokit;

async function main() {
  try {
    const prLabel = core.getInput('label', {required: false});
    const token = core.getInput('repo-token', {required: true});
    octokit = github.getOctokit(token);

    const files = await octokit.pulls.listFiles({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      pull_number: github.context.payload.number
    });

    let blankChanges = files.data.some(file => file.status === 'modified' );

    // Only consider modified files for blank changes.
    if (blankChanges) {
      for (const file of files.data) {
        if (file.status === 'modified') {
          isFileBlank(file).then(fileIsBlank => {
            if (!fileIsBlank) {
              blankChanges = false;
              return;
            }
          });

          if (!blankChanges)
            return
        }
      }
    }

    if (blankChanges && prLabel) {
      await labelPr(prLabel);
    }

    console.info(`Blank changes only: ${blankChanges}`);
    core.setOutput('blank-pr', blankChanges);
  } catch (error) {
    core.setFailed(error.message);
  }
}

function isFileBlank(file) {
    return new Promise(resolve => {
       let headContent;

      octokit.repos.getContent({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        path: file.filename,
        ref: github.context.payload.pull_request.head.ref
      }).then(data => {
        headContent = Buffer.from(data.data.content, 'base64').toString();

        return octokit.repos.getContent({
          owner: github.context.repo.owner,
          repo: github.context.repo.repo,
          path: file.filename,
          ref: github.context.payload.pull_request.base.ref
        });
      }).then(data => {
        const baseContent = Buffer.from(data.data.content, 'base64').toString();
        
        return isChangeBlank(headContent, baseContent);
      }).then(changeBlank => {
        resolve(changeBlank);
      });
    });
}

function isChangeBlank(baseContent, headContent) {
  return new Promise(resolve => {
    const dmp = new DiffMatchPatch();
    const diffs = dmp.diff_main(baseContent, headContent);

    if (diffs.length !== 0) {
      for (const diff of diffs) {
        if (diff[0] === -1 && diff[1].trim() !== '') { // diff[0] === -1 represents r.h.s. changes
          resolve(false);
        }
      }
    }

    resolve(true);
  });
}

async function labelPr(label) {
  await octokit.issues.addLabels({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    issue_number: github.context.payload.pull_request.number,
    labels: [label],
  });
}

main();