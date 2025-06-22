#!/bin/bash

# API接続テストスクリプト
# HotPepper無料Tier Restaurant Finder - API動作確認用

set -e

# 色付きログ用の定数
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 設定
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/.env.development"

# ログ出力関数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 環境変数読み込み
load_env() {
    if [ -f "$ENV_FILE" ]; then
        log_info "Loading environment variables from $ENV_FILE"
        set -a
        source "$ENV_FILE"
        set +a
    else
        log_error "Environment file not found: $ENV_FILE"
        exit 1
    fi
}

# HotPepper API テスト
test_hotpepper_api() {
    log_info "Testing HotPepper API..."
    
    if [ -z "$HOTPEPPER_API_KEY" ] || [ "$HOTPEPPER_API_KEY" = "your_hotpepper_api_key_here" ]; then
        log_error "HotPepper API key not configured properly"
        log_info "Please set HOTPEPPER_API_KEY in $ENV_FILE"
        return 1
    fi
    
    local endpoint="https://webservice.recruit.co.jp/hotpepper/gourmet/v1/"
    local params="key=${HOTPEPPER_API_KEY}&lat=35.6812&lng=139.7671&range=3&count=5&format=json"
    
    log_info "Calling HotPepper API: $endpoint"
    
    local response=$(curl -s -w "%{http_code}" --max-time 10 "${endpoint}?${params}" 2>/dev/null)
    local http_code="${response: -3}"
    local body="${response%???}"
    
    if [ "$http_code" = "200" ]; then
        local shop_count=$(echo "$body" | grep -o '"results_returned":"[0-9]*"' | grep -o '[0-9]*' || echo "0")
        if [ "$shop_count" -gt 0 ]; then
            log_success "HotPepper API is working! Found $shop_count restaurants"
            echo "$body" | head -n 5
            return 0
        else
            log_warning "HotPepper API responded but returned 0 results"
            return 1
        fi
    else
        log_error "HotPepper API failed with HTTP $http_code"
        echo "Response: $body" | head -n 3
        return 1
    fi
}

# Google Places API テスト
test_google_places_api() {
    log_info "Testing Google Places API..."
    
    if [ -z "$GOOGLE_PLACES_API_KEY" ] || [ "$GOOGLE_PLACES_API_KEY" = "your_google_places_api_key_here" ]; then
        log_warning "Google Places API key not configured (optional)"
        return 0
    fi
    
    local endpoint="https://maps.googleapis.com/maps/api/place/textsearch/json"
    local params="query=restaurant+tokyo&key=${GOOGLE_PLACES_API_KEY}"
    
    log_info "Calling Google Places API: $endpoint"
    
    local response=$(curl -s -w "%{http_code}" --max-time 10 "${endpoint}?${params}" 2>/dev/null)
    local http_code="${response: -3}"
    local body="${response%???}"
    
    if [ "$http_code" = "200" ]; then
        local status=$(echo "$body" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
        if [ "$status" = "OK" ]; then
            local results_count=$(echo "$body" | grep -o '"results":\[' | wc -l)
            log_success "Google Places API is working! Status: $status"
            return 0
        else
            log_error "Google Places API returned status: $status"
            echo "$body" | head -n 3
            return 1
        fi
    else
        log_error "Google Places API failed with HTTP $http_code"
        echo "Response: $body" | head -n 3
        return 1
    fi
}

# アプリケーション API テスト
test_application_api() {
    log_info "Testing application API endpoints..."
    
    # アプリケーションが起動しているかチェック
    local app_url="${API_BASE_URL:-http://localhost:3000}"
    
    log_info "Checking application health: $app_url/health"
    
    if response=$(curl -s --max-time 5 "$app_url/health" 2>/dev/null); then
        log_success "Application is running"
        echo "Health response: $response" | head -n 2
    else
        log_warning "Application is not running on $app_url"
        log_info "Start the application with: npm run start"
        return 1
    fi
    
    # レストラン検索テスト
    log_info "Testing restaurant search API..."
    
    local search_url="$app_url/api/restaurants/search?location=東京駅&genre=居酒屋&limit=5"
    
    if search_response=$(curl -s --max-time 10 "$search_url" 2>/dev/null); then
        local restaurant_count=$(echo "$search_response" | grep -o '"restaurants":\[' | wc -l)
        if [ "$restaurant_count" -gt 0 ]; then
            log_success "Restaurant search API is working"
            echo "$search_response" | head -n 5
        else
            log_warning "Restaurant search returned no results"
            echo "$search_response" | head -n 3
        fi
    else
        log_error "Restaurant search API failed"
        return 1
    fi
}

# 設定確認
check_configuration() {
    log_info "Checking configuration..."
    
    echo "=========================================="
    echo "   API Configuration Status"
    echo "=========================================="
    
    # USE_MOCK_API 設定確認
    if [ "$USE_MOCK_API" = "true" ]; then
        log_warning "USE_MOCK_API is set to true - using mock data"
        log_info "Set USE_MOCK_API=false to use real APIs"
    else
        log_success "USE_MOCK_API is disabled - using real APIs"
    fi
    
    # API有効化設定確認
    echo ""
    echo "API Enable Status:"
    echo "  ENABLE_HOTPEPPER: ${ENABLE_HOTPEPPER:-not set}"
    echo "  ENABLE_GOOGLE_PLACES: ${ENABLE_GOOGLE_PLACES:-not set}"
    echo "  ENABLE_TABELOG: ${ENABLE_TABELOG:-not set}"
    
    # APIキー設定確認
    echo ""
    echo "API Key Status:"
    if [ -n "$HOTPEPPER_API_KEY" ] && [ "$HOTPEPPER_API_KEY" != "your_hotpepper_api_key_here" ]; then
        echo "  HotPepper API Key: ✅ Configured"
    else
        echo "  HotPepper API Key: ❌ Not configured"
    fi
    
    if [ -n "$GOOGLE_PLACES_API_KEY" ] && [ "$GOOGLE_PLACES_API_KEY" != "your_google_places_api_key_here" ]; then
        echo "  Google Places API Key: ✅ Configured"
    else
        echo "  Google Places API Key: ⚠️ Not configured (optional)"
    fi
    
    # レート制限設定確認
    echo ""
    echo "Rate Limit Settings:"
    echo "  HotPepper RPM: ${HOTPEPPER_FREE_TIER_RPM:-2}"
    echo "  HotPepper RPH: ${HOTPEPPER_FREE_TIER_RPH:-50}"
    echo "  HotPepper RPD: ${HOTPEPPER_FREE_TIER_RPD:-300}"
    echo "  Tabelog Weekly Limit: ${TABELOG_FREE_TIER_WEEKLY_LIMIT:-50}"
    
    echo "=========================================="
}

# メイン実行関数
main() {
    echo "=========================================="
    echo "   HotPepper Restaurant Finder"
    echo "        API Connection Test"
    echo "=========================================="
    echo "Date: $(date)"
    echo ""
    
    # 環境変数読み込み
    load_env
    
    # 設定確認
    check_configuration
    
    echo ""
    log_info "Starting API tests..."
    echo ""
    
    local total_tests=0
    local passed_tests=0
    local failed_tests=0
    
    # HotPepper API テスト
    total_tests=$((total_tests + 1))
    if test_hotpepper_api; then
        passed_tests=$((passed_tests + 1))
    else
        failed_tests=$((failed_tests + 1))
    fi
    echo ""
    
    # Google Places API テスト
    total_tests=$((total_tests + 1))
    if test_google_places_api; then
        passed_tests=$((passed_tests + 1))
    else
        failed_tests=$((failed_tests + 1))
    fi
    echo ""
    
    # アプリケーション API テスト
    total_tests=$((total_tests + 1))
    if test_application_api; then
        passed_tests=$((passed_tests + 1))
    else
        failed_tests=$((failed_tests + 1))
    fi
    
    # サマリー表示
    echo ""
    echo "=========================================="
    echo "           API Test Summary"
    echo "=========================================="
    echo "Total Tests: $total_tests"
    echo -e "Passed: ${GREEN}$passed_tests${NC}"
    echo -e "Failed: ${RED}$failed_tests${NC}"
    echo "Success Rate: $(echo "scale=1; $passed_tests * 100 / $total_tests" | bc 2>/dev/null || echo "N/A")%"
    echo "=========================================="
    
    # 推奨アクション
    echo ""
    if [ "$failed_tests" -gt 0 ]; then
        log_warning "Some tests failed. Recommended actions:"
        
        if [ "$USE_MOCK_API" = "true" ]; then
            echo "  1. Set USE_MOCK_API=false in $ENV_FILE"
        fi
        
        if [ -z "$HOTPEPPER_API_KEY" ] || [ "$HOTPEPPER_API_KEY" = "your_hotpepper_api_key_here" ]; then
            echo "  2. Configure HotPepper API key"
            echo "     See: docs/api-key-setup-guide.md"
        fi
        
        echo "  3. Restart the application after configuration changes"
        exit 1
    else
        log_success "All tests passed! Your API integration is working correctly."
        exit 0
    fi
}

# ヘルプ表示
show_help() {
    echo "HotPepper Restaurant Finder API Test Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  -v, --verbose  Enable verbose output"
    echo ""
    echo "Environment Variables:"
    echo "  API_BASE_URL   Application base URL (default: http://localhost:3000)"
    echo ""
    echo "This script tests:"
    echo "  1. HotPepper API connectivity"
    echo "  2. Google Places API connectivity (if configured)"
    echo "  3. Application API endpoints"
    echo ""
    echo "Configuration file: $ENV_FILE"
    echo "Setup guide: docs/api-key-setup-guide.md"
}

# コマンドライン引数解析
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -v|--verbose)
            set -x
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# bc がない場合のフォールバック
if ! command -v bc &> /dev/null; then
    log_warning "bc command not found, percentage calculation will be skipped"
fi

# メイン実行
main