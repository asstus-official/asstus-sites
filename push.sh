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

# Check GitHub authentication and write permission
print_info "Checking GitHub authentication and write permissions..."

# Get remote URL
REMOTE_URL=$(git config --get remote.origin.url)
if [ -z "$REMOTE_URL" ]; then
    print_error "No remote origin configured!"
    exit_script "Please add a remote origin first."
    return 1
fi

# Test basic connection
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

print_success "GitHub connection successful"

# Check write permissions by attempting to fetch
print_info "Verifying write permissions..."

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)

# Try to check if we can push to the current branch
# We'll do this by checking if we can fetch and if the repo allows pushes
git fetch origin > /dev/null 2>&1

# Check if we have push access by examining git capabilities
if git ls-remote --heads origin > /dev/null 2>&1; then
    # Try a dry-run push to verify write access
    if ! git push --dry-run origin "$CURRENT_BRANCH" 2>&1 | grep -q "Everything up-to-date\|^To\|Would set upstream"; then
        # Check the error more specifically
        DRY_RUN_OUTPUT=$(git push --dry-run origin "$CURRENT_BRANCH" 2>&1)
        
        if echo "$DRY_RUN_OUTPUT" | grep -q "Permission denied\|denied to\|403\|cannot push\|protected branch"; then
            print_error "Write permission denied!"
            echo
            print_warning "You do not have write access to this repository."
            echo
            echo "Possible reasons:"
            echo "  1. You don't have push access to 'asstus-official/asstus-sites'"
            echo "  2. The branch is protected and requires review"
            echo "  3. Your authentication token lacks write permissions"
            echo
            echo "Solutions:"
            echo "  1. Ask the repository owner to grant you write access"
            echo "  2. Fork the repository and push to your fork instead"
            echo "  3. If using a token, regenerate with 'repo' permissions at:"
            echo "     https://github.com/settings/tokens"
            echo
            exit_script "Script cannot continue without write permissions."
            return 1
        fi
    fi
fi

print_success "Write permissions verified"
echo

# Show current branch
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

# Get current date in ddmmyy format
DATE=$(date +%d%m%y)

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

# Ask to save log
print_info "Do you want to save a log file?"
echo "  1) Yes, save to log.txt"
echo "  2) No, skip log"
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
PUSH_OUTPUT=$(git push origin "$SELECTED_BRANCH" 2>&1)
PUSH_EXIT_CODE=$?

echo "$PUSH_OUTPUT"

if [ $PUSH_EXIT_CODE -ne 0 ]; then
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
    PUSH_OUTPUT=$(git push --set-upstream origin "$SELECTED_BRANCH" 2>&1)
    PUSH_EXIT_CODE=$?
    echo "$PUSH_OUTPUT"
    
    if [ $PUSH_EXIT_CODE -ne 0 ]; then
        print_error "Failed to push! Please check your permissions."
        exit_script "Push failed - check authentication."
        return 1
    fi
fi

print_success "Pushed successfully!"
echo

# Get the latest commit hash
COMMIT_HASH=$(git rev-parse HEAD)
SHORT_HASH=$(git rev-parse --short HEAD)

print_info "Commit: ${GREEN}${SHORT_HASH}${NC}"
echo

# Function to manage Cloudflare deployments
manage_cloudflare_deployments() {
    print_info "Do you want to manage previous Cloudflare deployments?"
    echo "  1) Yes, list and delete old deployments"
    echo "  2) No, skip"
    read -p "Enter choice (1-2): " manage_choice
    
    if [ "$manage_choice" != "1" ]; then
        return 0
    fi
    
    echo
    print_info "Checking for Cloudflare API credentials..."
    
    # Check for API credentials from GitHub secrets or environment variables
    CF_API_TOKEN="${CLOUDFLARE_API_TOKEN:-}"
    CF_ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-}"
    CF_PROJECT_NAME="asstus-sites"
    
    # If running in GitHub Actions, credentials should be available as environment variables
    if [ -n "$GITHUB_ACTIONS" ]; then
        print_info "Running in GitHub Actions environment"
        if [ -z "$CF_API_TOKEN" ] || [ -z "$CF_ACCOUNT_ID" ]; then
            print_error "Cloudflare credentials not found in GitHub secrets!"
            echo
            echo "Please add the following secrets to your GitHub repository:"
            echo "  1. Go to: Settings → Secrets and variables → Actions"
            echo "  2. Add secrets:"
            echo "     • CLOUDFLARE_API_TOKEN"
            echo "     • CLOUDFLARE_ACCOUNT_ID"
            echo
            print_warning "Skipping deployment management."
            return 0
        fi
    else
        # If not in GitHub Actions, try to get from user or environment
        if [ -z "$CF_API_TOKEN" ]; then
            echo
            print_warning "Cloudflare API Token not found in environment!"
            echo
            echo "To manage deployments, you need:"
            echo "  1. Cloudflare API Token (with Pages:Edit permission)"
            echo "  2. Cloudflare Account ID"
            echo
            echo "For GitHub Actions, add these as repository secrets:"
            echo "  • Go to: Settings → Secrets and variables → Actions"
            echo "  • Add: CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID"
            echo
            echo "For local use, set environment variables:"
            echo "  export CLOUDFLARE_API_TOKEN='your-token'"
            echo "  export CLOUDFLARE_ACCOUNT_ID='your-account-id'"
            echo
            echo "Get credentials from: https://dash.cloudflare.com/profile/api-tokens"
            echo
            read -p "Enter Cloudflare API Token (or press Enter to skip): " CF_API_TOKEN
            
            if [ -z "$CF_API_TOKEN" ]; then
                print_warning "Skipping deployment management."
                return 0
            fi
        fi
        
        if [ -z "$CF_ACCOUNT_ID" ]; then
            read -p "Enter Cloudflare Account ID: " CF_ACCOUNT_ID
            
            if [ -z "$CF_ACCOUNT_ID" ]; then
                print_warning "Account ID required. Skipping deployment management."
                return 0
            fi
        fi
        
        # Suggest adding to shell profile for future use
        echo
        print_info "💡 Tip: Add these to your ~/.bashrc or ~/.zshrc for persistence:"
        echo "  export CLOUDFLARE_API_TOKEN='your-token'"
        echo "  export CLOUDFLARE_ACCOUNT_ID='your-account-id'"
    fi
    
    echo
    print_info "Fetching deployments for branch: ${GREEN}${SELECTED_BRANCH}${NC}"
    
    # Fetch deployments from Cloudflare API
    API_RESPONSE=$(curl -s -X GET \
        "https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/pages/projects/${CF_PROJECT_NAME}/deployments" \
        -H "Authorization: Bearer ${CF_API_TOKEN}" \
        -H "Content-Type: application/json")
    
    # Check if API call was successful
    if ! echo "$API_RESPONSE" | grep -q '"success":true'; then
        print_error "Failed to fetch deployments!"
        echo "API Response:"
        echo "$API_RESPONSE" | head -20
        echo
        print_warning "Possible issues:"
        echo "  • Invalid API token"
        echo "  • Incorrect Account ID"
        echo "  • Missing API permissions (needs Pages:Edit)"
        return 1
    fi
    
    # Parse deployments for the selected branch
    # Using basic text parsing since we may not have jq installed
    DEPLOYMENTS=$(echo "$API_RESPONSE" | grep -o '"id":"[^"]*"' | sed 's/"id":"//g' | sed 's/"//g')
    
    if [ -z "$DEPLOYMENTS" ]; then
        print_warning "No deployments found for this branch."
        return 0
    fi
    
    # Create temporary file to store deployment info
    TEMP_FILE=$(mktemp)
    
    echo "$API_RESPONSE" > "$TEMP_FILE"
    
    # Display deployments
    echo
    print_success "Previous deployments found:"
    echo
    
    DEPLOYMENT_COUNT=0
    declare -a DEPLOYMENT_IDS
    declare -a DEPLOYMENT_URLS
    declare -a DEPLOYMENT_DATES
    
    # Parse and display deployments (limited parsing without jq)
    while IFS= read -r deployment_id; do
        DEPLOYMENT_COUNT=$((DEPLOYMENT_COUNT + 1))
        
        # Try to extract URL and created date
        DEPLOYMENT_URL=$(echo "$API_RESPONSE" | grep -A 20 "\"id\":\"$deployment_id\"" | grep -o '"url":"[^"]*"' | head -1 | sed 's/"url":"//g' | sed 's/"//g')
        CREATED_AT=$(echo "$API_RESPONSE" | grep -A 20 "\"id\":\"$deployment_id\"" | grep -o '"created_on":"[^"]*"' | head -1 | sed 's/"created_on":"//g' | sed 's/"//g')
        
        DEPLOYMENT_IDS+=("$deployment_id")
        DEPLOYMENT_URLS+=("$DEPLOYMENT_URL")
        DEPLOYMENT_DATES+=("$CREATED_AT")
        
        printf "  %d) %s\n" $DEPLOYMENT_COUNT "${DEPLOYMENT_URL:-$deployment_id}"
        printf "     Created: %s\n" "${CREATED_AT:-Unknown}"
        printf "     ID: %s\n" "$deployment_id"
        echo
    done <<< "$DEPLOYMENTS"
    
    rm -f "$TEMP_FILE"
    
    if [ $DEPLOYMENT_COUNT -eq 0 ]; then
        print_warning "No deployments to display."
        return 0
    fi
    
    # Ask which deployments to delete
    echo
    print_info "Which deployments do you want to delete?"
    echo "  • Enter numbers separated by spaces (e.g., 1 3 5)"
    echo "  • Enter 'all' to delete all except the latest"
    echo "  • Enter 'none' or press Enter to skip"
    read -p "Enter choice: " delete_choice
    
    if [ -z "$delete_choice" ] || [ "$delete_choice" = "none" ]; then
        print_info "No deployments deleted."
        return 0
    fi
    
    # Parse deletion choices
    declare -a TO_DELETE
    
    if [ "$delete_choice" = "all" ]; then
        # Delete all except the first one (latest)
        for i in $(seq 2 $DEPLOYMENT_COUNT); do
            TO_DELETE+=($i)
        done
    else
        # Parse space-separated numbers
        for num in $delete_choice; do
            if [[ "$num" =~ ^[0-9]+$ ]] && [ "$num" -ge 1 ] && [ "$num" -le $DEPLOYMENT_COUNT ]; then
                TO_DELETE+=($num)
            else
                print_warning "Invalid number: $num (skipped)"
            fi
        done
    fi
    
    if [ ${#TO_DELETE[@]} -eq 0 ]; then
        print_warning "No valid deployments selected for deletion."
        return 0
    fi
    
    # Confirm deletion
    echo
    print_warning "You are about to delete ${#TO_DELETE[@]} deployment(s)."
    read -p "Are you sure? (y/n): " confirm_delete
    
    if [ "$confirm_delete" != "y" ] && [ "$confirm_delete" != "Y" ]; then
        print_info "Deletion cancelled."
        return 0
    fi
    
    # Delete selected deployments
    echo
    print_info "Deleting deployments..."
    
    DELETED_COUNT=0
    FAILED_COUNT=0
    
    for index in "${TO_DELETE[@]}"; do
        deployment_id="${DEPLOYMENT_IDS[$((index-1))]}"
        deployment_url="${DEPLOYMENT_URLS[$((index-1))]}"
        
        print_info "Deleting: ${deployment_url:-$deployment_id}"
        
        DELETE_RESPONSE=$(curl -s -X DELETE \
            "https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/pages/projects/${CF_PROJECT_NAME}/deployments/${deployment_id}" \
            -H "Authorization: Bearer ${CF_API_TOKEN}" \
            -H "Content-Type: application/json")
        
        if echo "$DELETE_RESPONSE" | grep -q '"success":true'; then
            print_success "✓ Deleted successfully"
            DELETED_COUNT=$((DELETED_COUNT + 1))
        else
            print_error "✗ Failed to delete"
            FAILED_COUNT=$((FAILED_COUNT + 1))
        fi
    done
    
    echo
    print_success "Deletion complete: ${DELETED_COUNT} deleted, ${FAILED_COUNT} failed"
}

# Call the function
manage_cloudflare_deployments
echo

# Generate Cloudflare Pages URL
PROJECT_NAME="asstus-sites"

# Sanitize branch name for URL (replace special characters with -)
SANITIZED_BRANCH=$(echo "$SELECTED_BRANCH" | sed 's/[^a-zA-Z0-9-]/-/g' | tr '[:upper:]' '[:lower:]')

if [ "$SELECTED_BRANCH" = "main" ] || [ "$SELECTED_BRANCH" = "master" ]; then
    CLOUDFLARE_URL="https://${PROJECT_NAME}.pages.dev"
    print_success "Production deployment URL:"
    echo -e "${GREEN}${CLOUDFLARE_URL}${NC}"
else
    # For preview deployments, Cloudflare uses commit hash
    PREVIEW_URL="https://${SHORT_HASH}.${PROJECT_NAME}.pages.dev"
    BRANCH_URL="https://${SANITIZED_BRANCH}.${PROJECT_NAME}.pages.dev"
    
    print_success "Preview deployment URLs:"
    echo -e "${GREEN}By commit: ${PREVIEW_URL}${NC}"
    echo -e "${GREEN}By branch: ${BRANCH_URL}${NC}"
fi
echo

print_info "📊 Cloudflare Pages Dashboard:"
echo -e "${BLUE}https://dash.cloudflare.com/${NC}"
echo

print_warning "⏳ Deployment status:"
echo "  • Build typically takes 1-3 minutes"
echo "  • Check the dashboard above for real-time status"
echo "  • You'll see deployment logs and the actual URL once built"
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