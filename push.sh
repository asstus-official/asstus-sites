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

# Function to exit gracefully without closing terminal
exit_script() {
    echo
    print_warning "$1"
    echo
    read -p "Press Enter to continue..."
    return 0
}

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    print_error "Not a git repository!"
    exit_script "Exiting..."
    return 1
fi

# Check if there are any changes
if git diff --quiet && git diff --cached --quiet; then
    print_warning "No changes detected in the repository!"
    exit_script "Nothing to commit."
    return 0
fi

# Get GitHub username
AUTHOR=$(git config user.name)
if [ -z "$AUTHOR" ]; then
    print_error "Git user.name not configured!"
    echo "Run: git config user.name 'Your Name'"
    exit_script "Configuration needed."
    return 1
fi

# Check GitHub authentication
print_info "Checking GitHub authentication..."
if ! git ls-remote origin > /dev/null 2>&1; then
    print_error "Cannot connect to GitHub repository!"
    print_warning "You may need to authenticate with GitHub."
    echo
    echo "Choose authentication method:"
    echo "  1) Use SSH (recommended)"
    echo "  2) Use GitHub Personal Access Token"
    echo
    echo "For SSH: Make sure you have SSH keys set up"
    echo "For Token: Generate one at https://github.com/settings/tokens"
    echo
    exit_script "Please set up authentication and try again."
    return 1
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
            exit_script "Branch switching failed."
            return 1
        fi
        ;;
    3)
        read -p "Enter new branch name: " NEW_BRANCH
        git checkout -b "$NEW_BRANCH"
        if [ $? -ne 0 ]; then
            print_error "Failed to create branch $NEW_BRANCH"
            exit_script "Branch creation failed."
            return 1
        fi
        SELECTED_BRANCH=$NEW_BRANCH
        ;;
    *)
        print_error "Invalid choice!"
        exit_script "Invalid selection."
        return 1
        ;;
esac

print_success "Working on branch: $SELECTED_BRANCH"
echo

# Show changed files
print_info "Changed files:"
CHANGED_FILES_LIST=$(git status --short)

if [ -z "$CHANGED_FILES_LIST" ]; then
    print_warning "No changed files found!"
    exit_script "Nothing to commit."
    return 0
fi

echo "$CHANGED_FILES_LIST"
echo

# Ask which files to add
print_info "Which files do you want to add?"
echo "  1) Add all changed files"
echo "  2) Select specific files by number"
read -p "Enter choice (1-2): " file_choice

case $file_choice in
    1)
        git add -A
        CHANGED_FILES=$(git diff --cached --name-only | tr '\n' ', ' | sed 's/,$//')
        ;;
    2)
        # Create an array of changed files
        mapfile -t FILES_ARRAY < <(git status --short | awk '{print $2}')
        
        if [ ${#FILES_ARRAY[@]} -eq 0 ]; then
            print_warning "No files to add!"
            exit_script "No changes detected."
            return 0
        fi
        
        print_info "Select files to add (enter numbers separated by space, e.g., 1 3 5):"
        echo
        
        # Display files with numbers
        for i in "${!FILES_ARRAY[@]}"; do
            printf "  %d) %s\n" $((i+1)) "${FILES_ARRAY[$i]}"
        done
        echo
        
        read -p "Enter file numbers: " file_numbers
        
        # Validate and add selected files
        SELECTED_FILES=""
        for num in $file_numbers; do
            index=$((num-1))
            if [ $index -ge 0 ] && [ $index -lt ${#FILES_ARRAY[@]} ]; then
                SELECTED_FILES="$SELECTED_FILES ${FILES_ARRAY[$index]}"
            else
                print_warning "Invalid file number: $num (skipped)"
            fi
        done
        
        if [ -z "$SELECTED_FILES" ]; then
            print_error "No valid files selected!"
            exit_script "Selection failed."
            return 1
        fi
        
        git add $SELECTED_FILES
        if [ $? -ne 0 ]; then
            print_error "Failed to add files!"
            exit_script "Git add failed."
            return 1
        fi
        
        CHANGED_FILES=$(echo $SELECTED_FILES | tr ' ' ',')
        ;;
    *)
        print_error "Invalid choice!"
        exit_script "Invalid selection."
        return 1
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
    exit_script "Nothing to commit."
    return 0
fi

# Get only filenames (without path) for commit message
FILE_NAMES=$(git diff --cached --name-only | xargs -n1 basename | paste -sd "," - | sed 's/,/, /g')

# Ask for goal
print_info "What is the goal of these changes?"
read -p "Goal: " GOAL

if [ -z "$GOAL" ]; then
    print_error "Goal cannot be empty!"
    exit_script "Goal is required."
    return 1
fi

# Create commit message
COMMIT_MSG="${AUTHOR} @ ${DATE} : updating ${FILE_NAMES} for ${GOAL}"

echo
print_info "Commit message:"
echo -e "${YELLOW}$COMMIT_MSG${NC}"
echo

# Ask to save log before committing
print_info "Do you want to save a log file before committing?"
echo "  1) Yes, save to log.txt"
echo "  2) No, proceed without log"
read -p "Enter choice (1-2): " log_choice

if [ "$log_choice" = "1" ]; then
    LOG_FILE="log.txt"
    print_info "Generating log file..."
    
    # Create log content
    {
        echo "================================================"
        echo "GIT COMMIT LOG"
        echo "================================================"
        echo "Date: $(date '+%Y-%m-%d %H:%M:%S')"
        echo "Author: $AUTHOR"
        echo "Branch: $SELECTED_BRANCH"
        echo "Commit Message: $COMMIT_MSG"
        echo ""
        echo "================================================"
        echo "CHANGED FILES"
        echo "================================================"
        git diff --cached --name-status
        echo ""
        echo "================================================"
        echo "FILE CHANGES SUMMARY"
        echo "================================================"
        git diff --cached --stat
        echo ""
        echo "================================================"
        echo "DETAILED CHANGES"
        echo "================================================"
        git diff --cached
    } > "$LOG_FILE"
    
    print_success "Log saved to: $LOG_FILE"
    
    # Ask if user wants to view the log
    read -p "Do you want to view the log? (y/n): " view_log
    if [ "$view_log" = "y" ] || [ "$view_log" = "Y" ]; then
        # Try to use less, fallback to cat
        if command -v less &> /dev/null; then
            less "$LOG_FILE"
        else
            cat "$LOG_FILE"
            echo
            read -p "Press Enter to continue..."
        fi
    fi
    echo
fi

# Confirm before committing
read -p "Proceed with commit and push? (y/n): " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    print_warning "Aborted by user!"
    exit_script "Operation cancelled."
    return 0
fi

# Commit
print_info "Committing changes..."
git commit -m "$COMMIT_MSG"

if [ $? -ne 0 ]; then
    print_error "Commit failed!"
    exit_script "Git commit error."
    return 1
fi

print_success "Committed successfully!"
echo

# Push
print_info "Pushing to remote branch: $SELECTED_BRANCH..."
git push origin "$SELECTED_BRANCH" 2>&1

if [ $? -ne 0 ]; then
    print_error "Push failed!"
    echo
    print_warning "Common solutions:"
    echo "  1. Check if you have permission to push to 'asstus-official/asstus-sites'"
    echo "  2. If you forked the repo, push to your fork instead:"
    echo "     git remote set-url origin https://github.com/YOUR_USERNAME/asstus-sites.git"
    echo "  3. Use SSH instead of HTTPS:"
    echo "     git remote set-url origin git@github.com:asstus-official/asstus-sites.git"
    echo "  4. Generate a Personal Access Token with 'repo' permissions at:"
    echo "     https://github.com/settings/tokens"
    echo
    
    # Try to set upstream if it's a new branch
    print_info "Trying to set upstream..."
    git push --set-upstream origin "$SELECTED_BRANCH" 2>&1
    
    if [ $? -ne 0 ]; then
        print_error "Failed to push! Please check your permissions."
        exit_script "Push failed - check authentication."
        return 1
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
echo

# Keep terminal open
print_success "Script completed successfully!"
read -p "Press Enter to continue..."

# Optional: Open URL in browser (uncomment if desired)
# Detect OS and open browser
# if [[ "$OSTYPE" == "darwin"* ]]; then
#     open "$CLOUDFLARE_URL"
# elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
#     xdg-open "$CLOUDFLARE_URL"
# elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
#     start "$CLOUDFLARE_URL"
# fi