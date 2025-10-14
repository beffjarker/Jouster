# Contributing

## Git configuration

You will never be committing directly to the `master` branch. Instead, you will **branch from** and **merge to** the `master` branch. Do not commit directly to `master` — commit to a feature branch.

## Committing

**_Commit messages must follow the [Conventional Commits](https://www.conventionalcommits.org) standards._**

For a more detailed breakdown, it's also the [_same conventions used by the Angular team_](https://github.com/angular/angular/blob/master/CONTRIBUTING.md#commit), so you can [see some examples](https://github.com/angular/angular/blob/master/CONTRIBUTING.md#commit) here.

> ⚠️ **Do not** bypass any automatic checks when committing — you will not be allowed to merge if your commits do not follow convention.

### commitlint / commitizen

To enforce adherence to commit guidelines, this project uses [commitlint](https://github.com/marionebl/commitlint) to validate all commit messages follow convention. If your commit message does not meet the basic requirements, your commit will be rejected (with an explanation).

If you are new to Conventional Commits, you have 2 options available to you to help you along (2 different ways to invoke the same helper tool):

- [commitizen](http://commitizen.github.io/cz-cli) when installed, will allow you to type `git cz` instead of `git commit` to be walked through authoring a proper commit message. As a bonus, this new command will work on _any project_ that supports commitizen and will _function normally_ in all other cases, so you can make `git cz` your habit if you like.
- `yarn commit` will also invoke the same helper, if you don't want to install commitizen.

In either case, you will be prompted step-by-step with helpful references to help ensure a well-authored commit message. This tool is of course, _optional_ and is just provided as a helpful way to get in the habit and learn and understand the conventions, such as which `type` to use.

## GitHub Pull Requests

All code changes must be _linted_ and _unit-tested_. Do not bypass any automated linting or tests when committing or when pushing your branch. Doing so will only cause extra work for those reviewing your code and cause your PR process to take longer while you go back and fix any issues that arose from skipping any of the automated processes.

### Semantic Pull Requests

This repo uses [semantic-pull-requests](https://github.com/probot/semantic-pull-requests) to ensure proper commit messages. A PR will automatically be blocked if the Conventional Commits guidelines are not properly adhered to.

## FAQ

See also [Conventional Commits FAQ](https://www.conventionalcommits.org/en/v1.0.0-beta.3/#faq)

### 1. Why do I need to follow the [Conventional Commits](https://conventionalcommits.org) guidelines?

By using a very specific convention for all Git commits, we can

- Make sure commits all look the same no matter who committed (this makes reviewing commit history much easier)
- Automate changelog information based on the commit message convention
- Automate versioning of components based on the commit message convention
- [(read more)](https://www.conventionalcommits.org/en/v1.0.0-beta.3/#why-use-conventional-commits)

### 2. Why are approvals required?

This helps make sure a reasonable number of developers have reviewed your contribution and determined it to be concrete enough to be merged. This helps us narrow the window for defects or bad code to slip through.

## Further Reading

[1][digital platform branching strategy](https://republicservices.sharepoint.com/teams/GSP-BD-EBRIESHub/SitePages/Digital-Platform-Branching-Strategy.aspx)
