#!/bin/bash

# The only argument is the full webhook event, stringified.
JSONSTR=$1

# And here's how we'd use the json command-line tool to pull out details.
REPO=$(echo $JSONSTR | json repository.full_name)
BRANCH=$(echo $JSONSTR | json ref)
BRANCH=${BRANCH/refs\/heads\//}
HASH=$(echo $JSONSTR | json after)

echo "We would be acting on repo '$REPO' branch '$BRANCH' at commit $HASH"
