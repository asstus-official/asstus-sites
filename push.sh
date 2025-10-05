#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ ${NC}$1"
}

print_success() {
    echo -e "${GREEN}✓ ${NC}$1"
}

print_warning() {
    echo -e "${YELLOW}⚠ ${NC}$1"
}

print_error() {
    echo -e "${RED}✗ ${NC}$1"
}

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    print_error "Not a git repository!"
    exit 1
fi

# Get GitHub username
AUTHOR=$(git config user.name)
if [ -z "$AUTHOR" ]; then
    print_error "Git user.name not configured!"
    echo "Run: git config user.name 'Your Name'"
    exit 1
fi

# Get current date in ddmmyy format
DATE=$(date +%d%m%y)

# Show current branch
CURRENT_BRANCH=$(git branch --show-current)
print_info "Current branch: ${GREEN}$CURRENT_BRANCH${NC}"
echo

# Ask which branch to work on
print_info "Which branch do you want to use?"
echo "  1) Use current branch ($CURRENT_BRANCH)"
echo "  2) Switch to existing branch"
echo "  3) Create new branch"
read -p "Enter choice (1-3): " branch_choice

case $branch_choice in
    1)
        SELECTED_BRANCH=$CURRENT_BRANCH
        ;;
    2)
        print_info "Available branches:"
        git branch -a | grep -v "remotes/origin/HEAD"
        echo
        read -p "Enter branch name: " SELECTED_BRANCH
        git checkout "$SELECTED_BRANCH" 2>/dev/null
        if [ $? -ne 0 ]; then
            print_error "Failed to switch to branch $SELECTED_BRANCH"
            exit 1
        fi
        ;;
    3)
        read -p "Enter new branch name: " NEW_BRANCH
        git checkout -b "$NEW_BRANCH"
        if [ $? -ne 0 ]; then
            print_error "Failed to create branch $NEW_BRANCH"
            exit 1
        fi
        SELECTED_BRANCH=$NEW_BRANCH
        ;;
    *)
        print_error "Invalid choice!"
        exit 1
        ;;
esac

print_success "Working on branch: $SELECTED_BRANCH"
echo

# Show changed files
print_info "Changed files:"
git status --short
echo

# Ask which files to add
print_info "Which files do you want to add?"
echo "  1) Add all changed files"
echo "  2) Select specific files"
read -p "Enter choice (1-2): " file_choice

case $file_choice in
    1)
        git add -A
        CHANGED_FILES=$(git diff --cached --name-only | tr '\n' ', ' | sed 's/,$//')
        ;;
    2)
        print_info "Enter file paths (space-separated):"
        git status --short
        echo
        read -p "Files: " files
        git add $files
        if [ $? -ne 0 ]; then
            print_error "Failed to add files!"
            exit 1
        fi
        CHANGED_FILES=$(echo $files | tr ' ' ',')
        ;;
    *)
        print_error "Invalid choice!"
        exit 1
        ;;
esac

# Check if there are staged changes
if ! git diff --cached --quiet; then
    print_success "Files staged successfully"
    echo
    print_info "Staged files:"
    git diff --cached --name-only
    echo
else
    print_warning "No changes staged!"
    exit 0
fi

# Get only filenames (without path) for commit message
FILE_NAMES=$(git diff --cached --name-only | xargs -n1 basename | paste -sd "," - | sed 's/,/, /g')

# Ask for goal
print_info "What is the goal of these changes?"
read -p "Goal: " GOAL

if [ -z "$GOAL" ]; then
    print_error "Goal cannot be empty!"
    exit 1
fi

# Create commit message
COMMIT_MSG="${AUTHOR} @ ${DATE} : updating ${FILE_NAMES} for ${GOAL}"

echo
print_info "Commit message:"
echo -e "${YELLOW}$COMMIT_MSG${NC}"
echo

# Confirm before committing
read -p "Proceed with commit and push? (y/n): " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    print_warning "Aborted!"
    exit 0
fi

# Commit
print_info "Committing changes..."
git commit -m "$COMMIT_MSG"

if [ $? -ne 0 ]; then
    print_error "Commit failed!"
    exit 1
fi

print_success "Committed successfully!"
echo

# Push
print_info "Pushing to remote branch: $SELECTED_BRANCH..."
git push origin "$SELECTED_BRANCH"

if [ $? -ne 0 ]; then
    print_error "Push failed!"
    # Try to set upstream if it's a new branch
    print_info "Trying to set upstream..."
    git push --set-upstream origin "$SELECTED_BRANCH"
    if [ $? -ne 0 ]; then
        print_error "Failed to push!"
        exit 1
    fi
fi

print_success "Pushed successfully!"
echo

# Generate Cloudflare Pages URL
# Assuming project name is from docusaurus.config.ts projectName
PROJECT_NAME="asstus-sites"

# Sanitize branch name for URL (replace special characters with -)
SANITIZED_BRANCH=$(echo "$SELECTED_BRANCH" | sed 's/[^a-zA-Z0-9-]/-/g' | tr '[:upper:]' '[:lower:]')

if [ "$SELECTED_BRANCH" = "main" ] || [ "$SELECTED_BRANCH" = "master" ]; then
    CLOUDFLARE_URL="https://${PROJECT_NAME}.pages.dev"
    print_success "Production URL:"
else
    CLOUDFLARE_URL="https://${SANITIZED_BRANCH}.${PROJECT_NAME}.pages.dev"
    print_success "Preview URL:"
fi

echo -e "${GREEN}${CLOUDFLARE_URL}${NC}"
echo

print_info "Note: It may take 1-2 minutes for Cloudflare to build and deploy"
print_info "You can check deployment status at: https://dash.cloudflare.com/"

# Optional: Open URL in browser (uncomment if desired)
# Detect OS and open browser
# if [[ "$OSTYPE" == "darwin"* ]]; then
#     open "$CLOUDFLARE_URL"
# elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
#     xdg-open "$CLOUDFLARE_URL"
# elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
#     start "$CLOUDFLARE_URL"
# fi