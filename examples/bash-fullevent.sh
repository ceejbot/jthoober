#!/bin/bash

# The only argument is the full webhook event, stringified.

# And here's how we'd use the json command-line tool to pull out details.
REPO=$(echo $WEBHOOK_EVENT | json payload.repository.full_name)
BRANCH=$(echo $WEBHOOK_EVENT | json payload.ref)
BRANCH=${BRANCH/refs\/heads\//}
HASH=$(echo $WEBHOOK_EVENT | json payload.after)

echo "We would be acting on repo '$REPO' branch '$BRANCH' at commit $HASH"
