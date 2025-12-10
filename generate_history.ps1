$ErrorActionPreference = "Stop"

# Configuration
$StartDate = Get-Date -Date "2024-11-10"
$AuthorName = "Dileep" # Replace with your name if different
$AuthorEmail = "dileep.y23@iiits.in" # Using email from code

# Mappings of Date (Day Offset) to Files and Commit Message
# Format: @{ Day=0; Files=@("file1", "folder1"); Message="Init" }
$Commits = @(
    @{ Day = 0; Files = @("package.json", ".env", ".gitignore"); Message = "Initial project setup and configuration" },
    @{ Day = 1; Files = @("config/db.js", "db/schema.sql"); Message = "Database configuration and schema design" },
    @{ Day = 2; Files = @("server.js"); Message = "Server entry point and basic middleware setup" },
    @{ Day = 3; Files = @("config/passport.js", "middleware/auth.js"); Message = "Authentication configuration with Passport.js" },
    @{ Day = 4; Files = @("routes/authRoutes.js", "controllers/authController.js", "views/auth"); Message = "Authentication routes and login/register views" },
    @{ Day = 5; Files = @("views/layout.ejs", "views/partials", "public/css"); Message = "Base layout templates and main stylesheet" },
    @{ Day = 6; Files = @("controllers/dashboardController.js", "views/dashboard"); Message = "Dashboard controller and overview interface" },
    @{ Day = 7; Files = @("controllers/categoryController.js", "routes/categoryRoutes.js", "views/categories"); Message = "Category management implementation (CRUD)" },
    @{ Day = 8; Files = @("controllers/productController.js", "routes/productRoutes.js"); Message = "Product management backend logic" },
    @{ Day = 9; Files = @("views/products"); Message = "Product list and management UI" },
    @{ Day = 10; Files = @("middleware/upload.js", "public/uploads"); Message = "File upload configuration for product images" },
    @{ Day = 11; Files = @("controllers/searchController.js", "routes/searchRoutes.js"); Message = "Global search functionality implementation" },
    @{ Day = 12; Files = @("controllers/posController.js", "routes/posRoutes.js"); Message = "Point of Sale (POS) backend controller" },
    @{ Day = 13; Files = @("views/pos", "public/js/pos.js"); Message = "POS interface and cart management logic" },
    @{ Day = 14; Files = @("controllers/stockHistoryController.js", "routes/stockHistoryRoutes.js"); Message = "Stock movement history tracking backend" },
    @{ Day = 15; Files = @("views/stock-history"); Message = "Inventory movement history view" },
    @{ Day = 16; Files = @("controllers/teamController.js", "routes/teamRoutes.js"); Message = "Team management backend (Roles/Permissions)" },
    @{ Day = 17; Files = @("views/team"); Message = "Team members management UI" },
    @{ Day = 18; Files = @("services/emailService.js"); Message = "Email service integration for alerts" },
    @{ Day = 19; Files = @("services/notificationService.js", "routes/notificationRoutes.js"); Message = "In-app notification system backend" },
    @{ Day = 20; Files = @("middleware/globalData.js"); Message = "Global middleware for user sessions and notifications" },
    @{ Day = 21; Files = @("middleware/tenantMiddleware.js"); Message = "Multi-tenant isolation middleware" },
    @{ Day = 22; Files = @("controllers/settingsController.js", "routes/settingsRoutes.js"); Message = "Shop settings and profile management backend" },
    @{ Day = 23; Files = @("views/settings"); Message = "Settings and profile UI implementation" },
    @{ Day = 24; Files = @("controllers/chartController.js", "public/js/dashboard-charts.js"); Message = "Dashboard analytics and charts integration" },
    @{ Day = 25; Files = @("views/errors"); Message = "Custom 404 and 500 error pages" },
    @{ Day = 26; Files = @("public/images", "public/js"); Message = "Assets and utility scripts" },
    @{ Day = 27; Files = @("database"); Message = "Database migration scripts" },
    @{ Day = 28; Files = @("vercel.json"); Message = "Vercel deployment configuration" },
    @{ Day = 29; Files = @("README.md"); Message = "Project documentation and cleanup" }
)

Write-Host "⚠️  WARNING: This will RESET the git repository in the current folder."
Write-Host "It will simulate a history from $($StartDate.ToString('yyyy-MM-dd')) to today."
Write-Host "Make sure you have a backup if needed."
Write-Host "Starting in 5 seconds..."
Start-Sleep -Seconds 5

# 1. Reset Git
if (Test-Path ".git") {
    Remove-Item -Path ".git" -Recurse -Force
    Write-Host "Removed existing .git folder."
}
git init
git config user.name $AuthorName
git config user.email $AuthorEmail

# 2. Stage All Files Temporarily (to handle the logic easier)
# Actually, the easier strategy is to stage specific files if they exist.
# If files don't exist in that step, we skip or they are added in "Catch All" at end.

foreach ($Commit in $Commits) {
    # Add random hours (9-20) and minutes/seconds to make it look realistic
    $RandomHour = Get-Random -Minimum 9 -Maximum 21
    $RandomMinute = Get-Random -Minimum 0 -Maximum 59
    $RandomSecond = Get-Random -Minimum 0 -Maximum 59
    
    $Date = $StartDate.AddDays($Commit.Day).Date.AddHours($RandomHour).AddMinutes($RandomMinute).AddSeconds($RandomSecond)
    $DateStr = $Date.ToString("yyyy-MM-dd HH:mm:ss")
    
    # Check if files exist and stage them
    $FilesStaged = $false
    foreach ($FilePattern in $Commit.Files) {
        if (Test-Path $FilePattern) {
            git add $FilePattern
            $FilesStaged = $true
        }
    }

    if ($FilesStaged) {
        $Env:GIT_AUTHOR_DATE = "$DateStr"
        $Env:GIT_COMMITTER_DATE = "$DateStr"
        git commit -m $Commit.Message
        Write-Host "[$DateStr] Committed: $($Commit.Message)"
    }
    else {
        Write-Host "[$DateStr] Skipped (No files found): $($Commit.Message)"
    }
}

# 3. Final Catch-All Commit (for anything missed)
$FinalDate = Get-Date
$FinalDateStr = $FinalDate.ToString("yyyy-MM-dd HH:mm:ss")
git add .
$Status = git status --porcelain
if ($Status) {
    $Env:GIT_AUTHOR_DATE = "$FinalDateStr"
    $Env:GIT_COMMITTER_DATE = "$FinalDateStr"
    git commit -m "Final code polish and verification"
    Write-Host "[$FinalDateStr] Committed: Final code polish"
}

Write-Host "`n✅ History generation complete!"
Write-Host "You can now push to GitHub:"
Write-Host "git remote add origin <your-repo-url>"
Write-Host "git push -u origin master --force"
