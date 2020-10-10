# Detect Blank PR Action

## Description

A GitHub action designed to help reduce spam PR's.

It does this by detecting if a PR contains only whitespace, newlines or no changes.

It is intended to be chained with another action to perform additional actions,
such as one for closing the PR if it is blank.


# Example workflow

An example of a worflow chaining the output of this action with another to close 
blank PR's.

```javascript
on:
  pull_request:
    types: [opened, reopened]

jobs:
  close_blank_pr:
    runs-on: ubuntu-latest
    
    outputs:
      blank-pr: ${{ steps.blank-pr-step.outputs.blank-pr }}

    steps:
      - name: Checkout
        uses: actions/checkout@v2

      - name: Detect Blank PR
        id: blank-pr-step
        uses: ./
        # uses: adcdr/detect-blank-pr-action@1.0.0
        with:
          repo-token: ${{ secrets.GITHUB_TOKEN }}
          label: 'Blank PR'

      - name: Close Pull
        if: ${{ steps.blank-pr-step.outputs.blank-pr == 'true' }}
        uses: peter-evans/close-pull@v1.1.2
        with:
          comment: 'Auto closed for no significant changes.'
          delete-branch: 'false'
```