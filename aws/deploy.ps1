# JalSentry AWS SAM Deployment Script (PowerShell)
param(
    [string]$StackName = "jalsentry-stack",
    [string]$Region = "us-east-1",
    [string]$S3Bucket = ""
)

Write-Host "==> Step 1: Building AWS Lambda bundle..." -ForegroundColor Cyan
npm run build:lambda
if ($LASTEXITCODE -ne 0) {
    Write-Error "Lambda build failed"
    exit 1
}

Write-Host "==> Step 2: Deploying AWS SAM template..." -ForegroundColor Cyan
$deployCmd = "sam deploy --template-file aws/template.yaml --stack-name $StackName --region $Region --capabilities CAPABILITY_IAM --resolve-s3"
if ($S3Bucket) {
    $deployCmd += " --s3-bucket $S3Bucket"
}

Invoke-Expression $deployCmd

Write-Host "==> Deployment complete!" -ForegroundColor Green
