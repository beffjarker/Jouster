const fs = require('fs');
const path = require('path');

module.exports = ({ github, context, core }) => {
  const project = process.env.PROJECT;
  const projectJsonPath = path.join('apps', project, 'project.json');

  try {
    const projectJsonContent = fs.readFileSync(projectJsonPath, 'utf8');
    const projectData = JSON.parse(projectJsonContent);
    const tags = projectData.tags || [];

    const accountTag = tags.find((tag) => tag.startsWith('account:'));
    if (accountTag) {
      const accountValue = accountTag.split(':')[1];
      console.log(`Found account tag: ${accountValue}`);
      core.setOutput('account', accountValue);
      return accountValue;
    } else {
      core.setFailed('No account tag found in project.json tags');
    }
  } catch (error) {
    core.setFailed(`Error reading project.json: ${error.message}`);
  }
};
