#!/bin/bash
# Preview Environment Management Script
# This script helps manage and monitor preview environments

set -e

COMMAND="$1"
REGION="us-west-2"

show_help() {
    echo "Preview Environment Management"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  list                    List all preview environments"
    echo "  cleanup-old [days]      Cleanup environments older than X days (default: 7)"
    echo "  cleanup-all             Remove all preview environments (use with caution)"
    echo "  info <bucket-name>      Show detailed info about a preview environment"
    echo "  logs <bucket-name>      Show access logs for a preview environment"
    echo ""
    echo "Examples:"
    echo "  $0 list"
    echo "  $0 cleanup-old 3"
    echo "  $0 info pr123-feature-branch.jouster.org"
    echo ""
}

list_previews() {
    echo "========================================"
    echo "PREVIEW ENVIRONMENTS"
    echo "========================================"

    # Get all buckets with preview tags
    aws s3api list-buckets --region $REGION --output json | \
        jq -r '.Buckets[] | select(.Name | contains("pr") and contains(".jouster.org")) | .Name' | \
        while read -r bucket; do
            echo "📦 Bucket: $bucket"

            # Get bucket tags
            tags=$(aws s3api get-bucket-tagging --bucket "$bucket" --region $REGION 2>/dev/null | \
                   jq -r '.TagSet[] | "\(.Key)=\(.Value)"' 2>/dev/null || echo "No tags")

            if [ "$tags" != "No tags" ]; then
                echo "   Tags: $tags" | tr '\n' ' '
                echo ""
            fi

            # Get bucket creation date
            creation_date=$(aws s3api list-buckets --region $REGION --output json | \
                           jq -r ".Buckets[] | select(.Name==\"$bucket\") | .CreationDate")
            echo "   Created: $creation_date"

            # Get website URL
            echo "   URL: http://$bucket.s3-website-$REGION.amazonaws.com"
            echo ""
        done
}

cleanup_old_previews() {
    days=${2:-7}
    cutoff_date=$(date -d "$days days ago" -u +"%Y-%m-%dT%H:%M:%S.000Z")

    echo "========================================"
    echo "CLEANUP OLD PREVIEW ENVIRONMENTS"
    echo "========================================"
    echo "🗓️  Removing environments older than $days days"
    echo "📅 Cutoff date: $cutoff_date"
    echo ""

    aws s3api list-buckets --region $REGION --output json | \
        jq -r '.Buckets[] | select(.Name | contains("pr") and contains(".jouster.org")) | "\(.Name) \(.CreationDate)"' | \
        while read -r bucket creation_date; do
            if [[ "$creation_date" < "$cutoff_date" ]]; then
                echo "🗑️  Removing old environment: $bucket (created: $creation_date)"

                # Remove all objects first
                aws s3 rm "s3://$bucket" --recursive --quiet

                # Remove bucket
                aws s3 rb "s3://$bucket" --force

                echo "   ✅ Removed"
            else
                echo "✅ Keeping recent environment: $bucket (created: $creation_date)"
            fi
        done

    echo ""
    echo "🧹 Cleanup completed!"
}

cleanup_all_previews() {
    echo "========================================"
    echo "⚠️  CLEANUP ALL PREVIEW ENVIRONMENTS"
    echo "========================================"
    echo "This will remove ALL preview environments!"
    echo ""
    read -p "Are you sure? Type 'yes' to continue: " confirm

    if [ "$confirm" != "yes" ]; then
        echo "❌ Cancelled"
        exit 0
    fi

    aws s3api list-buckets --region $REGION --output json | \
        jq -r '.Buckets[] | select(.Name | contains("pr") and contains(".jouster.org")) | .Name' | \
        while read -r bucket; do
            echo "🗑️  Removing: $bucket"
            aws s3 rm "s3://$bucket" --recursive --quiet
            aws s3 rb "s3://$bucket" --force
            echo "   ✅ Removed"
        done

    echo ""
    echo "🧹 All preview environments removed!"
}

show_info() {
    bucket_name="$2"

    if [ -z "$bucket_name" ]; then
        echo "❌ Bucket name required"
        echo "Usage: $0 info <bucket-name>"
        exit 1
    fi

    echo "========================================"
    echo "PREVIEW ENVIRONMENT INFO"
    echo "========================================"
    echo "📦 Bucket: $bucket_name"
    echo ""

    # Check if bucket exists
    if ! aws s3api head-bucket --bucket "$bucket_name" --region $REGION 2>/dev/null; then
        echo "❌ Bucket does not exist"
        exit 1
    fi

    # Get bucket info
    creation_date=$(aws s3api list-buckets --region $REGION --output json | \
                   jq -r ".Buckets[] | select(.Name==\"$bucket_name\") | .CreationDate")
    echo "📅 Created: $creation_date"

    # Get bucket tags
    echo "🏷️  Tags:"
    aws s3api get-bucket-tagging --bucket "$bucket_name" --region $REGION 2>/dev/null | \
        jq -r '.TagSet[] | "   \(.Key): \(.Value)"' 2>/dev/null || echo "   No tags"

    # Get bucket size
    echo ""
    echo "📊 Storage:"
    size=$(aws s3 ls "s3://$bucket_name" --recursive --summarize | tail -2)
    echo "   $size"

    # Get website configuration
    echo ""
    echo "🌐 Website Configuration:"
    aws s3api get-bucket-website --bucket "$bucket_name" --region $REGION 2>/dev/null | \
        jq -r '"   Index: \(.IndexDocument.Suffix // "Not set")\n   Error: \(.ErrorDocument.Key // "Not set")"' || \
        echo "   Website hosting not configured"

    echo ""
    echo "🔗 URLs:"
    echo "   S3 Website: http://$bucket_name.s3-website-$REGION.amazonaws.com"
    echo "   Custom Domain: https://$bucket_name (if DNS configured)"
}

case $COMMAND in
    "list")
        list_previews
        ;;
    "cleanup-old")
        cleanup_old_previews "$@"
        ;;
    "cleanup-all")
        cleanup_all_previews
        ;;
    "info")
        show_info "$@"
        ;;
    "help"|"--help"|"-h"|"")
        show_help
        ;;
    *)
        echo "❌ Unknown command: $COMMAND"
        echo ""
        show_help
        exit 1
        ;;
esac
