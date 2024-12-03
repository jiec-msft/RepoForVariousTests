const fs = require('fs');
const readline = require('readline');
const path = require('path');

async function readLastLines(filePath, numLines) {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const lines = [];
  for await (const line of rl) {
    lines.push(line);
    if (lines.length > numLines) {
      lines.shift();
    }
  }

  return lines;
}

async function readAllFilesInDirectory(directory, numLines) {
  const files = fs.readdirSync(directory);
  let allLines = '';
  for (const file of files) {
    const filePath = path.join(directory, file);
    if (fs.statSync(filePath).isFile()) {
      const lines = await readLastLines(filePath, numLines);
      allLines += `\nFile: ${file}\n${lines.join('\n')}\n`;
    }
  }
  return allLines;
}

module.exports = async ({github, github_event_name, github_ref, github_run_id, context}) => {
  const { owner, repo } = context.repo;
  const issueTitle = "UI test failed";
  const issueBody = `
See reports from failed UI tests in the attachments. [link](${context.payload.artifactUrl})
- Event: ${github_event_name}
- Ref: ${github_ref}
- RunId: ${github_run_id}
Logs: 
\`\`\`
${await readAllFilesInDirectory('./reports/tests-ui/build/reports/tests/test/classes', 100)}
\`\`\`
  `.trim();
  const labels = ["automated issue"];
  const issue = await github.rest.issues.create({
    owner,
    repo,
    title: issueTitle,
    body: issueBody,
    labels
  });
  console.log(`Created issue https://github.com/${owner}/${repo}/issues/${issue.data.number}`);
  return issue.data.number;
};
